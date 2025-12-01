mod secrets;
mod workflow;
mod engine;

use tauri::{AppHandle, Emitter};
use std::collections::HashMap;
use std::time::Instant;
use rhai::{Scope, Dynamic};

#[derive(serde::Serialize)]
struct WorkflowResult {
    output: String,
    execution_time_ms: u128,
}

#[tauri::command]
async fn run_workflow(
    app: AppHandle,
    script: String,
    inputs: HashMap<String, String>,
    secret_keys: Vec<String>,
    ai_base_url: String,
) -> Result<WorkflowResult, String> {

    // 1. Setup Engine
    // Run in blocking thread because Rhai is sync
    let app_handle = app.clone();
    let result = tokio::task::spawn_blocking(move || {
        let engine = engine::init_engine(app_handle.clone(), ai_base_url);
        let mut scope = Scope::new();

        // 2. Inject Inputs
        for (k, v) in inputs {
            scope.push_constant(k, v);
        }

        // 3. Inject Secrets
        for key in secret_keys {
            if let Some(secret_val) = secrets::get_secret(&app_handle, &key) {
                // Determine variable name. Usually exact match.
                // e.g. OPENAI_KEY -> const OPENAI_KEY = "..."
                scope.push_constant(key, secret_val);
            } else {
                 let _ = app_handle.emit("log_event", format!("Warning: Secret '{}' not found.", key));
            }
        }

        // 4. Execute
        let start = Instant::now();
        match engine.eval_with_scope::<Dynamic>(&mut scope, &script) {
            Ok(result) => {
                let duration = start.elapsed().as_millis();
                // Convert dynamic to string for display
                let output_str = if result.is_string() {
                    result.into_string().unwrap()
                } else {
                    result.to_string()
                };

                Ok(WorkflowResult {
                    output: output_str,
                    execution_time_ms: duration,
                })
            },
            Err(e) => Err(format!("Runtime Error: {}", e)),
        }
    }).await.map_err(|e| e.to_string())?;

    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            secrets::save_secret,
            secrets::delete_secret,
            workflow::list_workflows,
            workflow::read_workflow,
            workflow::save_workflow,
            workflow::delete_workflow,
            run_workflow
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
