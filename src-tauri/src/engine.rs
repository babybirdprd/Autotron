use rhai::{Engine, Module, Dynamic, Map};
use tauri::{AppHandle, Emitter, Runtime};
use std::sync::Arc;
use reqwest::blocking::Client;
use serde_json::Value;

pub fn init_engine<R: Runtime>(app: AppHandle<R>, ai_base_url: String) -> Engine {
    let mut engine = Engine::new();

    // ==================
    // 1. LOGGING
    // ==================
    let app_clone = app.clone();
    engine.on_print(move |msg| {
         // Emit to frontend
         let _ = app_clone.emit("log_event", msg).unwrap_or(());
         // Also print to stdout for debug
         println!("[Script]: {}", msg);
    });

    // ==================
    // 2. HTTP MODULE
    // ==================
    let mut http_module = Module::new();

    http_module.set_native_fn("get", |url: &str, headers: Map| {
        http_request("GET", url, None, headers)
    });

    http_module.set_native_fn("post", |url: &str, body: Dynamic, headers: Map| {
        http_request("POST", url, Some(body), headers)
    });

    http_module.set_native_fn("put", |url: &str, body: Dynamic, headers: Map| {
        http_request("PUT", url, Some(body), headers)
    });

    http_module.set_native_fn("delete", |url: &str, headers: Map| {
        http_request("DELETE", url, None, headers)
    });

    engine.register_static_module("http", http_module.into());

    // ==================
    // 3. AI MODULE
    // ==================
    let mut ai_module = Module::new();
    let base_url = Arc::new(ai_base_url);

    let base_url_clone = base_url.clone();
    ai_module.set_native_fn("chat_complete", move |model: &str, prompt: &str, key: &str| {
        ai_chat_complete(model, prompt, key, &base_url_clone)
    });

    let base_url_clone2 = base_url.clone();
    ai_module.set_native_fn("generate_image", move |prompt: &str, key: &str| {
         ai_generate_image(prompt, key, &base_url_clone2)
    });

    engine.register_static_module("ai", ai_module.into());

    // ==================
    // 4. UTILS MODULE
    // ==================
    let mut utils_module = Module::new();

    utils_module.set_native_fn("sleep", |ms: i64| {
        std::thread::sleep(std::time::Duration::from_millis(ms as u64));
        Ok(())
    });

    utils_module.set_native_fn("parse_json", |json_str: &str| -> Result<Dynamic, Box<rhai::EvalAltResult>> {
        let v: Value = serde_json::from_str(json_str).map_err(|e| e.to_string())?;
        Ok(rhai::serde::to_dynamic(&v).map_err(|e| e.to_string())?)
    });

    engine.register_static_module("utils", utils_module.into());

    engine
}

// Helper for HTTP
fn http_request(method: &str, url: &str, body: Option<Dynamic>, headers: Map) -> Result<Dynamic, Box<rhai::EvalAltResult>> {
    let client = Client::new();
    let mut req = match method {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        _ => return Err("Unsupported method".into()),
    };

    // Headers
    for (k, v) in headers {
        if let Ok(val_str) = v.into_string() {
            req = req.header(k.as_str(), val_str);
        }
    }

    // Body
    if let Some(b) = body {
         // Convert Rhai dynamic to JSON
         let json_val: Value = rhai::serde::from_dynamic(&b).map_err(|e| e.to_string())?;
         req = req.json(&json_val);
    }

    let resp = req.send().map_err(|e| e.to_string())?;

    let status = resp.status().as_u16() as i64;
    let resp_headers = resp.headers().clone();
    let text = resp.text().map_err(|e| e.to_string())?;

    // Try parse body as JSON
    let body_dyn = if let Ok(json_val) = serde_json::from_str::<Value>(&text) {
        rhai::serde::to_dynamic(&json_val).unwrap_or(Dynamic::from(text.clone()))
    } else {
        Dynamic::from(text)
    };

    // Return Map: { status, body, headers }
    let mut result = Map::new();
    result.insert("status".into(), Dynamic::from(status));
    result.insert("body".into(), body_dyn);

    // Convert headers back to Map
    let mut header_map = Map::new();
    for (k, v) in resp_headers {
        if let Some(name) = k {
             if let Ok(val) = v.to_str() {
                 header_map.insert(name.as_str().into(), Dynamic::from(val.to_string()));
             }
        }
    }
    result.insert("headers".into(), Dynamic::from(header_map));

    Ok(Dynamic::from(result))
}

// Helper for AI Chat
fn ai_chat_complete(model: &str, prompt: &str, key: &str, base_url: &str) -> Result<String, Box<rhai::EvalAltResult>> {
    let client = Client::new();

    let url = if base_url.ends_with("/") {
        format!("{}chat/completions", base_url)
    } else {
        format!("{}/chat/completions", base_url)
    };

    let payload = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "user", "content": prompt }
        ]
    });

    let resp = client.post(&url)
        .header("Authorization", format!("Bearer {}", key))
        .json(&payload)
        .send()
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
         let err_text = resp.text().unwrap_or_default();
         return Err(format!("AI Error: {}", err_text).into());
    }

    let json: Value = resp.json().map_err(|e| format!("Parse error: {}", e))?;

    // Extract content
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("Invalid response format")?
        .to_string();

    Ok(content)
}

// Helper for AI Image
fn ai_generate_image(prompt: &str, key: &str, base_url: &str) -> Result<String, Box<rhai::EvalAltResult>> {
    let client = Client::new();
    let url = if base_url.ends_with("/") {
        format!("{}images/generations", base_url)
    } else {
        format!("{}/images/generations", base_url)
    };

    let payload = serde_json::json!({
        "prompt": prompt,
        "n": 1,
        "size": "512x512"
    });

    let resp = client.post(&url)
        .header("Authorization", format!("Bearer {}", key))
        .json(&payload)
        .send()
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
         return Err(format!("AI Image Error").into());
    }

    let json: Value = resp.json().map_err(|e| e.to_string())?;
    let image_url = json["data"][0]["url"]
        .as_str()
        .ok_or("Invalid response format")?
        .to_string();

    Ok(image_url)
}
