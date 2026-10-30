// What the pages cannot do by themselves: read a folder of Markdown files
// and write a workspace back to it, read and write other files of the disk,
// open a window for another workspace, and hear of the folders and .zip files
// the system asks the application to open (dropped on its icon, a double
// click in the Finder or the Explorer).

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// The extensions of the files the application opens; folders it opens too.
const EXTENSIONS: [&str; 1] = ["zip"];

/// The folders and files the system asked to open that no window has taken yet, and the one each new window was opened for.
#[derive(Default)]
struct Opened {
    pending: Vec<String>,
    by_window: HashMap<String, String>,
    /// The windows still loading that will take what is pending once their page asks.
    loading: HashSet<String>,
    windows: u32,
}

/// Every Markdown file under a folder, by its path from the folder with `/`
/// between its parts. Hidden files and folders, and `node_modules`, are left out.
fn markdown_files(root: &Path) -> std::io::Result<HashMap<String, PathBuf>> {
    let mut found = HashMap::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || name == "node_modules" {
                continue;
            }
            let path = entry.path();
            if entry.file_type()?.is_dir() {
                stack.push(path);
            } else if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("md")) {
                let relative = path.strip_prefix(root).unwrap_or(&path);
                let key = relative.components().map(|c| c.as_os_str().to_string_lossy().into_owned()).collect::<Vec<_>>().join("/");
                found.insert(key, path);
            }
        }
    }
    Ok(found)
}

/// The Markdown files of a folder and what each says: a workspace, for the page to read.
#[tauri::command]
fn read_folder(path: String) -> Result<HashMap<String, String>, String> {
    let files = markdown_files(Path::new(&path)).map_err(|e| e.to_string())?;
    let mut out = HashMap::new();
    for (key, file) in files {
        let text = std::fs::read_to_string(&file).map_err(|e| format!("{key}: {e}"))?;
        out.insert(key, text);
    }
    Ok(out)
}

/// Writes a workspace to a folder, a file by its path, each first beside it so
/// that a failure halfway leaves the old one; the Markdown files there that are
/// not among them (pages gone, renamed, moved) go. Says which went.
#[tauri::command]
fn write_folder(path: String, files: HashMap<String, String>) -> Result<Vec<String>, String> {
    let root = PathBuf::from(&path);
    std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    for (key, text) in &files {
        if key.split('/').any(|part| part == ".." || part.is_empty()) {
            return Err(format!("{key}: not a path inside the folder"));
        }
        let file = root.join(key);
        if let Some(parent) = file.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let name = file.file_name().ok_or("no file name")?.to_string_lossy().into_owned();
        let temporary = file.with_file_name(format!(".{name}.saving"));
        std::fs::write(&temporary, text).map_err(|e| e.to_string())?;
        std::fs::rename(&temporary, &file).map_err(|e| {
            let _ = std::fs::remove_file(&temporary);
            e.to_string()
        })?;
    }
    let mut removed = Vec::new();
    for (key, file) in markdown_files(&root).map_err(|e| e.to_string())? {
        if !files.contains_key(&key) && std::fs::remove_file(&file).is_ok() {
            removed.push(key);
            // A folder left empty by a page that moved goes too.
            let mut dir = file.parent().map(Path::to_path_buf);
            while let Some(d) = dir {
                if d == root || std::fs::remove_dir(&d).is_err() {
                    break;
                }
                dir = d.parent().map(Path::to_path_buf);
            }
        }
    }
    Ok(removed)
}

/// Whether a folder has Markdown files already.
#[tauri::command]
fn folder_has_notes(path: String) -> bool {
    markdown_files(Path::new(&path)).map(|files| !files.is_empty()).unwrap_or(false)
}

/// The bytes of a file.
#[tauri::command]
fn read_document(path: String) -> Result<Response, String> {
    std::fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

/// Writes the body of the request to the file its `path` header names. The
/// bytes go to a file beside it first: a failure halfway leaves the old one.
#[tauri::command]
fn write_document(request: Request<'_>) -> Result<(), String> {
    let path = request
        .headers()
        .get("path")
        .and_then(|value| value.to_str().ok())
        .map(percent_decode)
        .ok_or("no path to write to")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("the document did not come as bytes".into());
    };
    let path = PathBuf::from(path);
    let name = path.file_name().ok_or("no file name")?.to_string_lossy();
    let temporary = path.with_file_name(format!(".{name}.saving"));
    std::fs::write(&temporary, bytes).map_err(|e| e.to_string())?;
    std::fs::rename(&temporary, &path).map_err(|e| {
        let _ = std::fs::remove_file(&temporary);
        e.to_string()
    })
}

/// The document this window was opened for, or those the system asked to open meanwhile.
#[tauri::command]
fn take_opened(window: WebviewWindow, opened: State<'_, Mutex<Opened>>) -> Vec<String> {
    let mut opened = opened.lock().unwrap();
    opened.loading.remove(window.label());
    if let Some(path) = opened.by_window.remove(window.label()) {
        return vec![path];
    }
    std::mem::take(&mut opened.pending)
}

/// Closes every window as if the person closed it: each one with changes asks first, and may stay open.
#[tauri::command]
fn quit(app: AppHandle) {
    for window in app.webview_windows().values() {
        let _ = window.close();
    }
}

/// A new window, for a folder or a .zip at `path`, or for a new workspace.
#[tauri::command]
fn new_window(app: AppHandle, path: Option<String>) -> Result<(), String> {
    open_window(&app, path).map_err(|e| e.to_string())
}

fn open_window(app: &AppHandle, path: Option<String>) -> tauri::Result<()> {
    let opened = app.state::<Mutex<Opened>>();
    let label = {
        let mut opened = opened.lock().unwrap();
        opened.windows += 1;
        let label = format!("document-{}", opened.windows);
        match path {
            Some(path) => {
                opened.by_window.insert(label.clone(), path);
            }
            None => {
                opened.loading.insert(label.clone());
            }
        }
        label
    };
    // A little below and to the right of the one in front, as documents open.
    let offset = app.webview_windows().len() as f64 * 24.0;
    WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("ReboNotes")
        .inner_size(1360.0, 860.0)
        .min_inner_size(900.0, 560.0)
        .position(80.0 + offset, 60.0 + offset)
        .build()?;
    Ok(())
}

/// Documents the system asked to open: they wait until a window takes them,
/// and the window in front is told they are there.
fn documents_opened(app: &AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    {
        let state = app.state::<Mutex<Opened>>();
        let mut opened = state.lock().unwrap();
        opened.pending.extend(paths);
        // A window still loading takes them when its page is ready: the first one, when the
        // system opens the application for a document, is not even listed yet.
        if !opened.loading.is_empty() {
            return;
        }
    }
    let windows = app.webview_windows();
    let front = windows
        .values()
        .find(|window| window.is_focused().unwrap_or(false))
        .or_else(|| windows.values().next());
    match front {
        Some(window) => {
            let _ = app.emit_to(window.label(), "documents-opened", ());
        }
        None => {
            let _ = open_window(app, None);
        }
    }
}

/// The documents among the arguments the application was started with, as Windows and Linux open a file with it.
fn documents_in_args() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| Path::new(arg).is_dir() || (Path::new(arg).is_file() && Path::new(arg).extension().is_some_and(|ext| EXTENSIONS.iter().any(|known| ext.eq_ignore_ascii_case(known)))))
        .collect()
}

/// `%XX` back to the byte it stands for: the header carries the path that way, as it may not be ASCII.
fn percent_decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(byte) = hex.and_then(|hex| u8::from_str_radix(hex, 16).ok()) {
                out.push(byte);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(Opened { pending: documents_in_args(), ..Default::default() }))
        .invoke_handler(tauri::generate_handler![read_folder, write_folder, folder_has_notes, read_document, write_document, take_opened, new_window, quit])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let opened = window.state::<Mutex<Opened>>();
                opened.lock().unwrap().loading.remove(window.label());
            }
        })
        .setup(|app| {
            // On a Mac the document the application was started for may have opened one already.
            let opened = app.state::<Mutex<Opened>>().lock().unwrap().windows;
            if opened == 0 {
                open_window(app.handle(), None)?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the application could not start");

    app.run(|_app, _event| {
        // On a Mac a document comes as an event, also the one the application was started for.
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = _event {
            let paths = urls
                .into_iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned())
                .collect();
            documents_opened(_app, paths);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_a_workspace_and_reads_it_back() {
        let root = std::env::temp_dir().join(format!("rebonotes-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join(".git")).unwrap();
        std::fs::write(root.join(".git/HEAD"), "ref").unwrap();
        let mut files = HashMap::new();
        files.insert("Plan.md".to_string(), "# Plan".to_string());
        files.insert("Plan/Budget.md".to_string(), "# Budget".to_string());
        assert!(write_folder(root.to_string_lossy().into(), files).unwrap().is_empty());
        let read = read_folder(root.to_string_lossy().into()).unwrap();
        assert_eq!(read.len(), 2);
        assert_eq!(read["Plan/Budget.md"], "# Budget");

        // A page renamed: its old file goes, and the folder it left empty with it.
        let mut renamed = HashMap::new();
        renamed.insert("Plan.md".to_string(), "# Plan".to_string());
        renamed.insert("Costs.md".to_string(), "# Costs".to_string());
        let removed = write_folder(root.to_string_lossy().into(), renamed).unwrap();
        assert_eq!(removed, vec!["Plan/Budget.md".to_string()]);
        assert!(!root.join("Plan").exists());
        assert!(root.join(".git/HEAD").exists());
        assert!(folder_has_notes(root.to_string_lossy().into()));

        let mut outside = HashMap::new();
        outside.insert("../escape.md".to_string(), "no".to_string());
        assert!(write_folder(root.to_string_lossy().into(), outside).is_err());
        std::fs::remove_dir_all(&root).unwrap();
    }
}
