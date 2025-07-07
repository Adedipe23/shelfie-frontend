use tauri::State;
use crate::{AppState, models::*};
use crate::auth::check_permission;

#[tauri::command]
pub async fn get_notifications(
    token: String,
    user_id: Option<i64>,
    unread_only: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<Notification>, String> {
    // Check if user has permission to view notifications (basic dashboard access)
    check_permission(&token, "dashboard_access").await?;

    let db = state.db.lock().await;
    db.get_notifications(user_id, unread_only.unwrap_or(false)).await
        .map_err(|e| format!("Failed to get notifications: {}", e))
}

#[tauri::command]
pub async fn mark_notification_read(
    token: String,
    notificationId: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if user has permission to manage notifications
    check_permission(&token, "dashboard_access").await?;

    let db = state.db.lock().await;
    db.mark_notification_read(notificationId).await
        .map_err(|e| format!("Failed to mark notification as read: {}", e))
}

#[tauri::command]
pub async fn get_expiring_products(
    token: String,
    days_ahead: Option<i32>,
    state: State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    // Check if user has permission to view inventory
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.get_expiring_products(days_ahead.unwrap_or(7)).await
        .map_err(|e| format!("Failed to get expiring products: {}", e))
}

#[tauri::command]
pub async fn check_alerts(
    token: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Check if user has permission to manage inventory
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.check_and_create_alerts().await
        .map_err(|e| format!("Failed to check alerts: {}", e))
}

#[tauri::command]
pub async fn create_notification(
    token: String,
    user_id: Option<i64>,
    title: String,
    message: String,
    notification_type: String,
    priority: String,
    product_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    // Check if user has permission to create notifications (admin only)
    check_permission(&token, "user_management").await?;
    
    let db = state.db.lock().await;
    db.create_notification(user_id, &title, &message, &notification_type, &priority, product_id).await
        .map_err(|e| format!("Failed to create notification: {}", e))
}
