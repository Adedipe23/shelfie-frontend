use tauri::State;
use crate::{AppState, models::*};
use crate::auth::check_permission;

#[tauri::command]
pub async fn get_users(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<User>, String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.get_all_users().await
        .map_err(|e| format!("Failed to get users: {}", e))
}

#[tauri::command]
pub async fn create_user(
    token: String,
    email: String,
    full_name: String,
    role: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.create_user(&email, &full_name, &role, &password).await
        .map_err(|e| format!("Failed to create user: {}", e))
}

#[tauri::command]
pub async fn update_user(
    token: String,
    user_id: i64,
    email: String,
    full_name: String,
    role: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.update_user(user_id, &email, &full_name, &role).await
        .map_err(|e| format!("Failed to update user: {}", e))
}

#[tauri::command]
pub async fn delete_user(
    token: String,
    user_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.delete_user(user_id).await
        .map_err(|e| format!("Failed to delete user: {}", e))
}

#[tauri::command]
pub async fn get_roles(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Role>, String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.get_all_roles().await
        .map_err(|e| format!("Failed to get roles: {}", e))
}

#[tauri::command]
pub async fn get_permissions(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Permission>, String> {
    // Check if user has permission to manage users
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.get_all_permissions().await
        .map_err(|e| format!("Failed to get permissions: {}", e))
}
