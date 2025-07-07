use tauri::State;
use crate::{AppState, models::*};
use crate::auth::check_permission;

#[tauri::command]
pub async fn search_products_by_sku(
    token: String,
    sku: String,
    state: State<'_, AppState>,
) -> Result<Option<Product>, String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.get_product_by_sku(&sku).await
        .map_err(|e| format!("Failed to search product: {}", e))
}

#[tauri::command]
pub async fn search_products_by_name(
    token: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.search_products_by_name(&query).await
        .map_err(|e| format!("Failed to search products: {}", e))
}

#[tauri::command]
pub async fn create_order(
    token: String,
    order_data: CreateOrderRequest,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.create_order(order_data).await
        .map_err(|e| format!("Failed to create order: {}", e))
}

#[tauri::command]
pub async fn complete_order(
    token: String,
    order_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.complete_order(order_id).await
        .map_err(|e| format!("Failed to complete order: {}", e))
}

#[tauri::command]
pub async fn cancel_order(
    token: String,
    order_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.cancel_order(order_id).await
        .map_err(|e| format!("Failed to cancel order: {}", e))
}

#[tauri::command]
pub async fn get_recent_orders(
    token: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<Order>, String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.get_recent_orders(limit.unwrap_or(10)).await
        .map_err(|e| format!("Failed to get recent orders: {}", e))
}

#[tauri::command]
pub async fn get_order_items(
    token: String,
    order_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<OrderItem>, String> {
    check_permission(&token, "sales_management").await?;
    
    let db = state.db.lock().await;
    db.get_order_items(order_id).await
        .map_err(|e| format!("Failed to get order items: {}", e))
}

// Barcode scanning simulation (in a real implementation, this would interface with hardware)
#[tauri::command]
pub async fn process_barcode_scan(
    token: String,
    barcode: String,
    state: State<'_, AppState>,
) -> Result<Option<Product>, String> {
    check_permission(&token, "sales_management").await?;
    
    println!("Processing barcode scan: {}", barcode);
    
    // For now, treat barcode as SKU
    let db = state.db.lock().await;
    db.get_product_by_sku(&barcode).await
        .map_err(|e| format!("Failed to process barcode: {}", e))
}

// Print receipt simulation (in a real implementation, this would interface with printer hardware)
#[tauri::command]
pub async fn print_receipt(
    token: String,
    order_id: i64,
    _state: State<'_, AppState>,
) -> Result<String, String> {
    check_permission(&token, "sales_management").await?;
    
    println!("Printing receipt for order: {}", order_id);
    
    // In a real implementation, this would:
    // 1. Get order details from database
    // 2. Format receipt content
    // 3. Send to thermal printer via ESC/POS commands
    // 4. Return success/failure status
    
    Ok("Receipt printed successfully".to_string())
}

// Cash drawer simulation (in a real implementation, this would interface with cash drawer hardware)
#[tauri::command]
pub async fn open_cash_drawer(
    token: String,
) -> Result<String, String> {
    check_permission(&token, "sales_management").await?;
    
    println!("Opening cash drawer");
    
    // In a real implementation, this would:
    // 1. Send signal to cash drawer (usually via printer port)
    // 2. Return success/failure status
    
    Ok("Cash drawer opened successfully".to_string())
}
