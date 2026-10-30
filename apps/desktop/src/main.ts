// ReboNotes on the desktop: each window is a workspace, a folder of Markdown
// files on the disk, written back a moment after every change, so that the
// folder is always what the notes say (and can be kept in git, or opened in
// any editor). Tauri adds the native menu, the dialogs, and the folders the
// system asks to open. A workspace not in a folder yet (the first one, or a
// .zip opened) is kept when a folder is chosen for it.

import { createPage, sampleWorkspace, type Workspace, workspaceFromFiles, workspaceFromZip, workspaceToFiles } from '@rebonotes/core';
import { mountNotes, type Notes } from '@rebonotes/editor';
import { docsFormat } from '@rebonotes/editor/rebodocs';
import { sheetsFormat } from '@rebonotes/editor/rebosheets';
import { slidesFormat } from '@rebonotes/editor/reboslides';
import { invoke } from '@tauri-apps/api/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ask, message, open, save } from '@tauri-apps/plugin-dialog';

const win = getCurrentWebviewWindow();
const IS_MAC = /Mac/.test(navigator.platform);
const host = document.getElementById('app')!;

// --- Language ---------------------------------------------------------------

const LOCALE_KEY = 'notes.locale';
const FOLDER_KEY = 'notes.folder';
const keep = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nowhere to keep it.
  }
};
const kept = (key: string) => {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
};
let locale = kept(LOCALE_KEY) ?? (navigator.language.startsWith('es') ? 'es' : 'en');
const say = (es: string, en: string) => (locale === 'es' ? es : en);

// --- The workspace ------------------------------------------------------------

/** The folder the workspace is written to, once it has one. */
let folder: string | undefined;
/** Changes not written to a folder yet. */
let dirty = false;
let writing: Promise<unknown> = Promise.resolve();
let writeTimer: ReturnType<typeof setTimeout> | undefined;
let notes: Notes;

const baseName = (path: string) =>
  path
    .replace(/[\\/]+$/, '')
    .split(/[\\/]/)
    .pop() ?? path;
const title = () => (folder ? baseName(folder) : say('Notas sin carpeta', 'Notes without a folder'));
const failed = (what: string, error: unknown) => message(`${what}: ${error instanceof Error ? error.message : String(error)}`, { title: 'ReboNotes', kind: 'error' });

let shown = '';
function showTitle(): void {
  const next = `${title()}${dirty && !folder ? (IS_MAC ? ' — ' : ' • ') + say('sin guardar', 'not saved') : ''}`;
  if (next === shown) return;
  shown = next;
  document.title = next;
  void win.setTitle(next);
}

/** The notes, mounted again in another language with the same workspace and page. */
function mount(workspace: Workspace, page?: string): void {
  const theme = notes?.root.dataset.theme as 'light' | 'dark' | undefined;
  notes?.destroy();
  notes = mountNotes(host, {
    workspace,
    page,
    locale,
    menu: false,
    name: folder ? baseName(folder) : 'ReboNotes',
    formats: [sheetsFormat, slidesFormat, docsFormat],
    onChange: () => changed(),
  });
  if (theme) notes.setTheme(theme);
  notes.focus();
}

/** A change: written to the folder a moment later, or kept as not saved without one. */
function changed(): void {
  dirty = true;
  showTitle();
  if (!folder) return;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => void write(), 500);
}

/** The workspace written to its folder, one write after another. */
function write(): Promise<unknown> {
  clearTimeout(writeTimer);
  if (!folder) return Promise.resolve();
  const to = folder;
  const files = workspaceToFiles(notes.workspace);
  dirty = false;
  writing = writing
    .then(() => invoke<string[]>('write_folder', { path: to, files }))
    .catch((error) => {
      dirty = true;
      return failed(say('No se pudo guardar en la carpeta', 'Could not save to the folder'), error);
    })
    .finally(showTitle);
  return writing;
}

const pristine = () => !folder && !dirty;

/** A folder opened as the workspace of this window. */
async function loadFolder(path: string): Promise<void> {
  try {
    const files = await invoke<Record<string, string>>('read_folder', { path });
    const workspace = workspaceFromFiles(files);
    folder = path;
    dirty = false;
    keep(FOLDER_KEY, path);
    mount(workspace.pages.length ? workspace : { pages: [createPage(baseName(path))] });
    showTitle();
    void installMenu();
  } catch (error) {
    await failed(say('No se pudo abrir la carpeta', 'Could not open the folder'), error);
  }
}

/** A .zip of Markdown opened: a workspace with no folder yet. */
async function loadZip(path: string): Promise<void> {
  try {
    const bytes = new Uint8Array(await invoke<ArrayBuffer>('read_document', { path }));
    folder = undefined;
    mount(workspaceFromZip(bytes));
    dirty = true;
    showTitle();
  } catch (error) {
    await failed(say('No se pudo abrir el .zip', 'Could not open the .zip'), error);
  }
}

/** Folders and .zip files: the first here when this window has nothing yet, the others each in a window of its own. */
async function openPaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (path === folder) continue;
    if (pristine()) await (/\.zip$/i.test(path) ? loadZip(path) : loadFolder(path));
    else await invoke('new_window', { path });
  }
}

async function openFolderDialog(): Promise<void> {
  const picked = await open({ directory: true, multiple: false, title: say('Abrir una carpeta de notas', 'Open a folder of notes') });
  if (typeof picked === 'string') await openPaths([picked]);
}

async function openZipDialog(): Promise<void> {
  const picked = await open({ multiple: false, filters: [{ name: say('Notas (.zip)', 'Notes (.zip)'), extensions: ['zip'] }] });
  if (typeof picked === 'string') await openPaths([picked]);
}

/** A folder chosen for the workspace: it is written there, and from then on as it changes. */
async function saveToFolder(): Promise<void> {
  if (folder) {
    await write();
    return;
  }
  const picked = await open({ directory: true, multiple: false, title: say('Guardar las notas en una carpeta', 'Save the notes in a folder') });
  if (typeof picked !== 'string') return;
  // A folder with notes of its own would lose them: they are opened instead, if the person wants.
  if (await invoke<boolean>('folder_has_notes', { path: picked })) {
    const openIt = await ask(say(`«${baseName(picked)}» ya tiene notas. ¿Abrirlas en una ventana nueva?`, `“${baseName(picked)}” has notes already. Open them in a new window?`), {
      title: 'ReboNotes',
      kind: 'warning',
      okLabel: say('Abrir', 'Open'),
      cancelLabel: say('Cancelar', 'Cancel'),
    });
    if (openIt) await invoke('new_window', { path: picked });
    return;
  }
  folder = picked;
  keep(FOLDER_KEY, picked);
  await write();
  void installMenu();
}

const download = async (name: string, ext: string, bytes: Uint8Array) => {
  const picked = await save({ defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (picked) await invoke('write_document', bytes, { headers: { path: encodeURIComponent(picked) } }).catch((error) => failed(say('No se pudo guardar', 'Could not save'), error));
};
const exportZip = () => download(`${title()}.zip`, 'zip', notes.toZip());
const exportPage = () => {
  const page = notes.workspace.pages.find((p) => p.id === notes.page);
  return download(`${page?.title || say('Sin título', 'Untitled')}.md`, 'md', new TextEncoder().encode(notes.toMarkdown()));
};

// What is still to be written goes before the window closes; one with notes in no folder asks.
void win.onCloseRequested(async (event) => {
  if (folder) {
    if (dirty) {
      event.preventDefault();
      await write();
      await win.destroy();
    }
    return;
  }
  if (!dirty) return;
  const close = await ask(say('Estas notas no están guardadas en una carpeta. ¿Cerrar de todos modos?', 'These notes are not saved in a folder. Close anyway?'), {
    title: 'ReboNotes',
    kind: 'warning',
    okLabel: say('Cerrar sin guardar', 'Close without saving'),
    cancelLabel: say('Cancelar', 'Cancel'),
  });
  if (!close) event.preventDefault();
});

const takeOpened = async () => {
  const paths = await invoke<string[]>('take_opened');
  if (paths.length) await openPaths(paths);
  return paths.length > 0;
};
void win.listen('documents-opened', () => void takeOpened());

// What is dropped on the window: folders and .zip files are opened.
void getCurrentWebview().onDragDropEvent(async (event) => {
  if (event.payload.type !== 'drop') return;
  const paths = event.payload.paths.filter((path) => /\.zip$/i.test(path) || !/\.\w{1,6}$/.test(path));
  if (paths.length) await openPaths(paths);
});

// --- Native menu --------------------------------------------------------------

function setLocale(next: string): void {
  locale = next;
  keep(LOCALE_KEY, next);
  mount(notes.workspace, notes.page);
  shown = '';
  showTitle();
  void installMenu();
}

async function buildMenu(): Promise<Menu> {
  const item = (id: string, text: string, action: () => unknown, accelerator?: string) => MenuItem.new({ id, text, accelerator, action: () => void action() });
  const separator = () => PredefinedMenuItem.new({ item: 'Separator' });
  const app = IS_MAC
    ? [
        await Submenu.new({
          text: 'ReboNotes',
          items: [
            await PredefinedMenuItem.new({ item: { About: { name: 'ReboNotes', version: '0.2.0' } }, text: say('Acerca de ReboNotes', 'About ReboNotes') }),
            await separator(),
            await PredefinedMenuItem.new({ item: 'Hide', text: say('Ocultar ReboNotes', 'Hide ReboNotes') }),
            await PredefinedMenuItem.new({ item: 'HideOthers', text: say('Ocultar otros', 'Hide Others') }),
            await PredefinedMenuItem.new({ item: 'ShowAll', text: say('Mostrar todo', 'Show All') }),
            await separator(),
            await item('quit', say('Salir de ReboNotes', 'Quit ReboNotes'), () => invoke('quit'), 'CmdOrCtrl+Q'),
          ],
        }),
      ]
    : [];
  const file = await Submenu.new({
    text: say('Archivo', 'File'),
    items: [
      await item('page', say('Página nueva', 'New page'), () => notes.addPage(), 'CmdOrCtrl+N'),
      await item('window', say('Ventana nueva', 'New window'), () => invoke('new_window', { path: null }), 'CmdOrCtrl+Shift+N'),
      await separator(),
      await item('open', say('Abrir carpeta…', 'Open Folder…'), openFolderDialog, 'CmdOrCtrl+O'),
      await item('openZip', say('Abrir .zip…', 'Open .zip…'), openZipDialog),
      await separator(),
      await item('save', folder ? say('Guardar ahora', 'Save Now') : say('Guardar en una carpeta…', 'Save in a Folder…'), saveToFolder, 'CmdOrCtrl+S'),
      await item('zip', say('Exportar como .zip…', 'Export as .zip…'), exportZip),
      await item('md', say('Exportar la página como .md…', 'Export the Page as .md…'), exportPage),
      await separator(),
      await item('close', say('Cerrar ventana', 'Close Window'), () => win.close(), 'CmdOrCtrl+W'),
      ...(IS_MAC ? [] : [await item('quit', say('Salir', 'Quit'), () => invoke('quit'), 'CmdOrCtrl+Q')]),
    ],
  });
  const edit = await Submenu.new({
    text: say('Edición', 'Edit'),
    items: [
      await item('undo', say('Deshacer', 'Undo'), () => notes.undo(), 'CmdOrCtrl+Z'),
      await item('redo', say('Rehacer', 'Redo'), () => notes.redo(), 'CmdOrCtrl+Shift+Z'),
      await separator(),
      await PredefinedMenuItem.new({ item: 'Cut', text: say('Cortar', 'Cut') }),
      await PredefinedMenuItem.new({ item: 'Copy', text: say('Copiar', 'Copy') }),
      await PredefinedMenuItem.new({ item: 'Paste', text: say('Pegar', 'Paste') }),
      await PredefinedMenuItem.new({ item: 'SelectAll', text: say('Seleccionar todo', 'Select All') }),
    ],
  });
  const view = await Submenu.new({
    text: say('Ver', 'View'),
    items: [
      await item('search', say('Buscar…', 'Search…'), () => notes.search(), 'CmdOrCtrl+P'),
      await separator(),
      await item('light', say('Tema claro', 'Light theme'), () => notes.setTheme('light')),
      await item('dark', say('Tema oscuro', 'Dark theme'), () => notes.setTheme('dark')),
      await item('system', say('Como el sistema', 'As the system'), () => notes.setTheme('system')),
      await separator(),
      await item('es', 'Español', () => setLocale('es')),
      await item('en', 'English', () => setLocale('en')),
      ...(IS_MAC ? [await separator(), await PredefinedMenuItem.new({ item: 'Fullscreen', text: say('Pantalla completa', 'Enter Full Screen') })] : []),
    ],
  });
  const window = IS_MAC
    ? [
        await Submenu.new({
          text: say('Ventana', 'Window'),
          items: [await PredefinedMenuItem.new({ item: 'Minimize', text: say('Minimizar', 'Minimize') }), await PredefinedMenuItem.new({ item: 'Maximize', text: 'Zoom' })],
        }),
      ]
    : [];
  return Menu.new({ items: [...app, file, edit, view, ...window] });
}

let menu: Menu | undefined;
async function installMenu(): Promise<void> {
  menu = await buildMenu();
  if (!IS_MAC) await menu.setAsWindowMenu(win);
  else if (await win.isFocused()) await menu.setAsAppMenu();
}
void win.onFocusChanged(({ payload: focused }) => {
  if (focused && IS_MAC) void menu?.setAsAppMenu();
});

// The first window opens what the system asked for, or the folder of last time, or the sample.
mount(sampleWorkspace(locale));
showTitle();
void installMenu();
void (async () => {
  if (await takeOpened()) return;
  const last = kept(FOLDER_KEY);
  if (win.label === 'document-1' && last) await loadFolder(last);
})();
