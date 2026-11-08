use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    pub fullscreen: bool,
    pub gpu_acceleration: bool,
    pub uncap_fps: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            fullscreen: false,
            gpu_acceleration: true,
            uncap_fps: false,
        }
    }
}

impl Config {
    fn path() -> PathBuf {
        let base = std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("."));
        base.join("aimlockr").join("config.json")
    }

    pub fn load() -> Self {
        let path = Self::path();
        match fs::read_to_string(&path) {
            Ok(raw) => serde_json::from_str(&raw).unwrap_or_else(|e| {
                eprintln!("[aimlockr] bad config {}: {e}", path.display());
                Self::default()
            }),
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self) {
        let path = Self::path();
        if let Some(dir) = path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        match serde_json::to_string_pretty(self) {
            Ok(json) => {
                if let Err(e) = fs::write(&path, json) {
                    eprintln!("[aimlockr] failed to save {}: {e}", path.display());
                }
            }
            Err(e) => eprintln!("[aimlockr] failed to serialize config: {e}"),
        }
    }
}
