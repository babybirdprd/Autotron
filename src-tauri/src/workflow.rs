use std::fs;
use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub fn list_workflows<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("rhai") {
            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                files.push(name.to_string());
            }
        }
    }
    files.sort();
    Ok(files)
}

#[tauri::command]
pub fn read_workflow<R: Runtime>(app: AppHandle<R>, name: String) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.rhai", name));
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_workflow<R: Runtime>(app: AppHandle<R>, name: String, content: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !dir.exists() {
         fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    let path = dir.join(format!("{}.rhai", name));
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_workflow<R: Runtime>(app: AppHandle<R>, name: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.rhai", name));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
