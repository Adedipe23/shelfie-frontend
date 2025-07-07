use tauri::State;
use crate::{AppState, models::*};
use crate::auth::check_permission;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub date: String,
    pub total_sales: f64,
    pub total_orders: i64,
    pub average_order_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductSalesReport {
    pub product_id: i64,
    pub product_name: String,
    pub quantity_sold: i64,
    pub total_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryReport {
    pub total_products: i64,
    pub total_value: f64,
    pub low_stock_count: i64,
    pub expiring_soon_count: i64,
    pub categories: Vec<CategoryReport>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryReport {
    pub category: String,
    pub product_count: i64,
    pub total_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub today_sales: f64,
    pub today_orders: i64,
    pub total_products: i64,
    pub low_stock_count: i64,
    pub total_inventory_value: f64,
    pub recent_orders: Vec<Order>,
}

#[tauri::command]
pub async fn get_sales_report(
    token: String,
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> Result<Vec<SalesReport>, String> {
    // Check if user has permission to view reports
    check_permission(&token, "reporting").await?;

    let db = state.db.lock().await;

    // Get sales data grouped by date
    let sales_data = db.get_sales_by_date_range(&start_date, &end_date).await
        .map_err(|e| format!("Failed to get sales report: {}", e))?;

    Ok(sales_data)
}

#[tauri::command]
pub async fn get_product_sales_report(
    token: String,
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> Result<Vec<ProductSalesReport>, String> {
    // Check if user has permission to view reports
    check_permission(&token, "reporting").await?;

    let db = state.db.lock().await;

    // Get product sales data
    let product_sales = db.get_product_sales_by_date_range(&start_date, &end_date).await
        .map_err(|e| format!("Failed to get product sales report: {}", e))?;

    Ok(product_sales)
}

#[tauri::command]
pub async fn get_inventory_report(
    token: String,
    state: State<'_, AppState>,
) -> Result<InventoryReport, String> {
    // Check if user has permission to view reports
    check_permission(&token, "reporting").await?;
    
    let db = state.db.lock().await;
    
    // Get inventory statistics
    let inventory_report = db.get_inventory_report().await
        .map_err(|e| format!("Failed to get inventory report: {}", e))?;
    
    Ok(inventory_report)
}

#[tauri::command]
pub async fn get_dashboard_stats(
    token: String,
    state: State<'_, AppState>,
) -> Result<DashboardStats, String> {
    // Check if user has permission to view dashboard
    check_permission(&token, "dashboard_access").await?;
    
    let db = state.db.lock().await;
    
    // Get dashboard statistics
    let dashboard_stats = db.get_dashboard_stats().await
        .map_err(|e| format!("Failed to get dashboard stats: {}", e))?;
    
    Ok(dashboard_stats)
}

#[tauri::command]
pub async fn export_sales_report(
    token: String,
    start_date: String,
    end_date: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Check if user has permission to export reports
    check_permission(&token, "reporting").await?;

    let db = state.db.lock().await;

    // Get sales data
    let sales_data = db.get_sales_by_date_range(&start_date, &end_date).await
        .map_err(|e| format!("Failed to get sales data: {}", e))?;

    // Convert to CSV
    let mut csv_content = String::from("Date,Total Sales,Total Orders,Average Order Value\n");
    for sale in sales_data {
        csv_content.push_str(&format!(
            "{},{},{},{}\n",
            sale.date, sale.total_sales, sale.total_orders, sale.average_order_value
        ));
    }

    Ok(csv_content)
}

#[tauri::command]
pub async fn export_inventory_report(
    token: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Check if user has permission to export reports
    check_permission(&token, "reporting").await?;
    
    let db = state.db.lock().await;
    
    // Get all products for inventory report
    let products = db.get_all_products().await
        .map_err(|e| format!("Failed to get products: {}", e))?;
    
    // Convert to CSV (removed expiry date to match new schema)
    let mut csv_content = String::from("Name,SKU,Category,Quantity,Price,Cost,Total Value\n");
    for product in products {
        let total_value = product.price * product.quantity as f64;
        csv_content.push_str(&format!(
            "{},{},{},{},{},{},{}\n",
            product.name, product.sku, product.category,
            product.quantity, product.price, product.cost, total_value
        ));
    }
    
    Ok(csv_content)
}
