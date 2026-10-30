// No console window behind the application on Windows, once built.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rebonotes_desktop_lib::run()
}
