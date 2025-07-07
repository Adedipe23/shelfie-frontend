use tauri::State;
use crate::{AppState, models::*};
use crate::auth::check_permission;

// Product management commands
#[tauri::command]
pub async fn get_products(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.get_all_products().await
        .map_err(|e| format!("Failed to get products: {}", e))
}

#[tauri::command]
pub async fn create_product(
    token: String,
    product_data: CreateProductRequest,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.create_product(product_data).await
        .map_err(|e| format!("Failed to create product: {}", e))
}

#[tauri::command]
pub async fn update_product(
    token: String,
    product_id: i64,
    product_data: CreateProductRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.update_product(product_id, product_data).await
        .map_err(|e| format!("Failed to update product: {}", e))
}

#[tauri::command]
pub async fn delete_product(
    token: String,
    product_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.delete_product(product_id).await
        .map_err(|e| format!("Failed to delete product: {}", e))
}

#[tauri::command]
pub async fn update_stock(
    token: String,
    product_id: i64,
    stock_data: UpdateStockRequest,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.update_stock(product_id, stock_data).await
        .map_err(|e| format!("Failed to update stock: {}", e))
}

#[tauri::command]
pub async fn get_low_stock_products(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.get_low_stock_products().await
        .map_err(|e| format!("Failed to get low stock products: {}", e))
}

// Supplier management commands
#[tauri::command]
pub async fn get_suppliers(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<Supplier>, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.get_all_suppliers().await
        .map_err(|e| format!("Failed to get suppliers: {}", e))
}

#[tauri::command]
pub async fn create_supplier(
    token: String,
    name: String,
    contact_name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.create_supplier(&name, contact_name.as_deref(), email.as_deref(), phone.as_deref(), address.as_deref()).await
        .map_err(|e| format!("Failed to create supplier: {}", e))
}

#[tauri::command]
pub async fn update_supplier(
    token: String,
    supplier_id: i64,
    name: String,
    contact_name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.update_supplier(supplier_id, &name, contact_name.as_deref(), email.as_deref(), phone.as_deref(), address.as_deref()).await
        .map_err(|e| format!("Failed to update supplier: {}", e))
}

#[tauri::command]
pub async fn delete_supplier(
    token: String,
    supplier_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.delete_supplier(supplier_id).await
        .map_err(|e| format!("Failed to delete supplier: {}", e))
}

// Inventory movements
#[tauri::command]
pub async fn get_inventory_movements(
    token: String,
    product_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<InventoryMovement>, String> {
    check_permission(&token, "inventory_management").await?;
    
    let db = state.db.lock().await;
    db.get_inventory_movements(product_id).await
        .map_err(|e| format!("Failed to get inventory movements: {}", e))
}
