use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub is_authenticated: bool,
    pub last_synced_at: Option<String>,
}

pub struct AuthService {
    client_id: Option<String>,
    current_user: Arc<RwLock<Option<UserProfile>>>,
}

impl Default for AuthService {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthService {
    pub fn new() -> Self {
        let client_id = std::env::var("SV_GOOGLE_CLIENT_ID").ok();
        Self {
            client_id,
            current_user: Arc::new(RwLock::new(None)),
        }
    }

    pub fn set_client_id(&mut self, id: String) {
        self.client_id = Some(id);
    }

    pub fn get_client_id(&self) -> Option<String> {
        self.client_id.clone()
    }

    pub async fn get_current_user(&self) -> UserProfile {
        let lock = self.current_user.read().await;
        if let Some(user) = &*lock {
            user.clone()
        } else {
            UserProfile {
                email: "".into(),
                name: "Guest (Local Only)".into(),
                picture: None,
                is_authenticated: false,
                last_synced_at: None,
            }
        }
    }

    /// Mock or initiate PKCE flow with local loopback listener
    pub async fn start_oauth_flow(&self) -> Result<String, String> {
        let client_id = match &self.client_id {
            Some(id) if !id.trim().is_empty() => id.clone(),
            _ => return Err("Google OAuth Client ID is not configured. Please set SV_GOOGLE_CLIENT_ID or configure in Settings (see SETUP-GOOGLE.md)".into()),
        };

        let redirect_uri = "http://127.0.0.1:20130/oauth/callback";
        let auth_url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile%20https://www.googleapis.com/auth/drive.appdata&code_challenge_method=S256&code_challenge=mock_challenge",
            client_id, redirect_uri
        );

        info!("Starting OAuth PKCE flow: {}", auth_url);
        Ok(auth_url)
    }

    pub async fn sign_out(&self) -> Result<(), String> {
        let mut lock = self.current_user.write().await;
        *lock = None;
        info!("Signed out user and cleared session");
        Ok(())
    }
}

