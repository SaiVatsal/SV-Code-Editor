use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current_version: String,
    pub available_version: Option<String>,
    pub body: Option<String>,
    pub date: Option<String>,
    pub has_update: bool,
}

pub struct UpdaterService {
    app_data_dir: PathBuf,
}

impl Default for UpdaterService {
    fn default() -> Self {
        Self::new()
    }
}

impl UpdaterService {
    pub fn new() -> Self {
        let app_data = std::env::var("APPDATA")
            .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
        let app_data_dir = PathBuf::from(app_data).join("SV Code Editor");
        Self { app_data_dir }
    }

    /// Take a pre-update snapshot of settings for one-click rollback
    pub fn snapshot_settings(&self) -> Result<PathBuf, String> {
        let settings_file = self.app_data_dir.join("settings.json");
        let snapshots_dir = self.app_data_dir.join("snapshots");
        fs::create_dir_all(&snapshots_dir).map_err(|e| e.to_string())?;

        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let target = snapshots_dir.join(format!("settings_pre_update_{}.json", timestamp));

        if settings_file.exists() {
            fs::copy(&settings_file, &target).map_err(|e| e.to_string())?;
            info!("Created pre-update settings snapshot at {:?}", target);
        }

        Ok(target)
    }

    /// Roll back settings from the latest snapshot
    pub fn rollback_settings(&self) -> Result<(), String> {
        let snapshots_dir = self.app_data_dir.join("snapshots");
        if !snapshots_dir.exists() {
            return Err("No snapshots directory found".into());
        }

        let mut snapshots = Vec::new();
        for entry in fs::read_dir(&snapshots_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map_err(|e| e.to_string())?.is_file() {
                snapshots.push(entry.path());
            }
        }

        snapshots.sort();
        if let Some(latest) = snapshots.last() {
            let settings_file = self.app_data_dir.join("settings.json");
            fs::copy(latest, &settings_file).map_err(|e| e.to_string())?;
            info!("Rolled back settings from {:?}", latest);
            Ok(())
        } else {
            Err("No previous settings snapshots found for rollback".into())
        }
    }
}

