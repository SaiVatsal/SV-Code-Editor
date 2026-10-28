use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

pub struct CredentialsService {
    // In-memory fallback and Windows Credential Manager target prefix
    #[allow(dead_code)]
    prefix: String,
    memory_store: Arc<RwLock<HashMap<String, String>>>,
}

impl Default for CredentialsService {
    fn default() -> Self {
        Self::new()
    }
}

impl CredentialsService {
    pub fn new() -> Self {
        Self {
            prefix: "SVCodeEditor:".to_string(),
            memory_store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn set_credential(&self, key: &str, secret: &str) -> Result<(), String> {
        let mut store = self.memory_store.write().await;
        store.insert(key.to_string(), secret.to_string());
        info!("Stored secure credential for key: {}", key);
        Ok(())
    }

    pub async fn get_credential(&self, key: &str) -> Option<String> {
        let store = self.memory_store.read().await;
        store.get(key).cloned()
    }

    pub async fn delete_credential(&self, key: &str) -> Result<(), String> {
        let mut store = self.memory_store.write().await;
        store.remove(key);
        info!("Removed credential for key: {}", key);
        Ok(())
    }

    pub async fn clear_all_credentials(&self) -> Result<(), String> {
        let mut store = self.memory_store.write().await;
        store.clear();
        info!("Purged all stored credentials on sign-out");
        Ok(())
    }
}

