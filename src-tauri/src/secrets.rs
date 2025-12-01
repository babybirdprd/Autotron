use keyring::Entry;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
// A simple in-memory cache or file-fallback could be used here.
// For the "Complex" requirement, we will implement a robust fallback.

fn get_fallback_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    app.path().app_data_dir().expect("failed to get app data dir").join(".secrets_fallback.json")
}

fn save_fallback<R: Runtime>(app: &AppHandle<R>, key: &str, value: &str) -> Result<(), String> {
    let path = get_fallback_path(app);
    let mut secrets: serde_json::Map<String, serde_json::Value> = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };

    secrets.insert(key.to_string(), serde_json::Value::String(value.to_string()));

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = serde_json::to_string_pretty(&secrets).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_fallback<R: Runtime>(app: &AppHandle<R>, key: &str) -> Result<String, String> {
    let path = get_fallback_path(app);
    if !path.exists() {
        return Err("Secret not found in fallback".to_string());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let secrets: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();

    match secrets.get(key) {
        Some(val) => Ok(val.as_str().unwrap_or("").to_string()),
        None => Err("Secret not found".to_string()),
    }
}

fn delete_fallback<R: Runtime>(app: &AppHandle<R>, key: &str) -> Result<(), String> {
    let path = get_fallback_path(app);
    if !path.exists() { return Ok(()); }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut secrets: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();

    secrets.remove(key);

    let content = serde_json::to_string_pretty(&secrets).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn save_secret<R: Runtime>(app: AppHandle<R>, key: String, value: String) -> Result<(), String> {
    // Try Keyring
    let entry = Entry::new("automator-engine", &key);
    match entry {
        Ok(e) => {
            match e.set_password(&value) {
                Ok(_) => Ok(()),
                Err(err) => {
                    println!("Keyring error (save): {}. Using fallback.", err);
                    save_fallback(&app, &key, &value)
                }
            }
        },
        Err(err) => {
            println!("Keyring init error: {}. Using fallback.", err);
            save_fallback(&app, &key, &value)
        }
    }
}

#[tauri::command]
pub fn delete_secret<R: Runtime>(app: AppHandle<R>, key: String) -> Result<(), String> {
    let entry = Entry::new("automator-engine", &key);
    match entry {
        Ok(e) => {
            match e.delete_credential() {
                Ok(_) => Ok(()),
                Err(err) => {
                     println!("Keyring error (delete): {}. Trying fallback.", err);
                     delete_fallback(&app, &key)
                }
            }
        },
        Err(_) => delete_fallback(&app, &key)
    }
}

// Internal function to get secret (not exposed to frontend for security, frontend only manages keys)
pub fn get_secret<R: Runtime>(app: &AppHandle<R>, key: &str) -> Option<String> {
    let entry = Entry::new("automator-engine", key);
    match entry {
        Ok(e) => {
             match e.get_password() {
                 Ok(pwd) => Some(pwd),
                 Err(_) => get_fallback(app, key).ok()
             }
        },
        Err(_) => get_fallback(app, key).ok()
    }
}
