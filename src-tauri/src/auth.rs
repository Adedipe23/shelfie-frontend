use tauri::State;
use crate::{AppState, models::*};
use anyhow::Result;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;

// Simple in-memory session store for demo purposes
// In production, you'd want to use a more robust solution
lazy_static::lazy_static! {
    static ref SESSIONS: Arc<Mutex<HashMap<String, UserInfo>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn login(
    email: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<LoginResponse, String> {
    println!("Login attempt for email: {}", email);

    let db = state.db.lock().await;

    // Get user from database
    println!("Searching for user in database...");
    let user = db.get_user_by_email(&email).await
        .map_err(|e| {
            println!("Database error: {}", e);
            "Internal server error".to_string() // Generic error for security
        })?
        .ok_or_else(|| {
            println!("User not found for email: {}", email);
            "Invalid email or password".to_string()
        })?;

    println!("User found: {} ({})", user.full_name, user.email);

    // Verify password
    println!("Verifying password...");
    let is_valid = bcrypt::verify(&password, &user.password_hash)
        .map_err(|e| {
            println!("Password verification error: {}", e);
            "Internal server error".to_string() // Generic error for security
        })?;

    if !is_valid {
        println!("Password verification failed");
        return Err("Invalid email or password".to_string());
    }

    println!("Password verification successful");

    // Get user permissions
    let permissions = db.get_user_permissions(user.id).await
        .map_err(|e| format!("Failed to get user permissions: {}", e))?;

    // Create session token (in production, use JWT or similar)
    let session_token = uuid::Uuid::new_v4().to_string();

    let user_info = UserInfo {
        id: user.id,
        email: user.email.clone(),
        full_name: user.full_name.clone(),
        role: user.role.clone(),
        permissions,
    };

    // Store session
    let mut sessions = SESSIONS.lock().await;
    sessions.insert(session_token.clone(), user_info.clone());

    Ok(LoginResponse {
        access_token: session_token,
        user: user_info,
    })
}

#[tauri::command]
pub async fn logout(token: String) -> Result<String, String> {
    let mut sessions = SESSIONS.lock().await;
    sessions.remove(&token);
    Ok("Logged out successfully".to_string())
}

#[tauri::command]
pub async fn get_current_user(token: String) -> Result<UserInfo, String> {
    let sessions = SESSIONS.lock().await;
    let user_info = sessions.get(&token)
        .ok_or_else(|| "Invalid or expired session".to_string())?;
    Ok(user_info.clone())
}

// Helper function to validate session (for use in other commands)
pub async fn validate_session(token: &str) -> Result<UserInfo, String> {
    let sessions = SESSIONS.lock().await;
    let user_info = sessions.get(token)
        .ok_or_else(|| "Invalid or expired session".to_string())?;
    Ok(user_info.clone())
}

// Helper function to check if user has permission
pub async fn check_permission(token: &str, required_permission: &str) -> Result<UserInfo, String> {
    let user_info = validate_session(token).await?;

    if user_info.permissions.contains(&required_permission.to_string()) {
        Ok(user_info)
    } else {
        Err("Insufficient permissions".to_string())
    }
}

// Tauri command wrapper for validate_session
#[tauri::command]
pub async fn validate_user_session(token: String) -> Result<UserInfo, String> {
    validate_session(&token).await
}

// Tauri command wrapper for check_permission
#[tauri::command]
pub async fn check_user_permission(token: String, permission: String) -> Result<UserInfo, String> {
    check_permission(&token, &permission).await
}

// Save user data to local database after successful online login
#[tauri::command]
pub async fn save_user_to_local(
    user: User,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().await;

    if let Some(pool) = &db.pool {
        // Insert or update user in local database
        sqlx::query(
            r#"
            INSERT OR REPLACE INTO users
            (id, created_at, updated_at, email, hashed_password, full_name, role, is_active, is_superuser)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(user.id)
        .bind(user.created_at)
        .bind(user.updated_at)
        .bind(&user.email)
        .bind(&user.password_hash) // This will be empty/placeholder since we don't store actual passwords locally
        .bind(&user.full_name)
        .bind(&user.role)
        .bind(user.is_active)
        .bind(user.is_superuser)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to save user to local database: {}", e))?;

        println!("User {} saved to local database", user.email);
    }

    Ok(())
}
