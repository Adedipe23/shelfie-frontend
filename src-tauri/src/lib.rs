use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;

mod database;
mod auth;
mod models;
mod users;
mod inventory;
mod pos;
mod notifications;
mod reports;
mod api_proxy;
mod sync_service;

use database::Database;

// Application state
pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Open external URL command
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    // For development, we'll use a simple approach
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

// Database initialization command
#[tauri::command]
async fn init_database(app_handle: tauri::AppHandle) -> Result<String, String> {
    // Check if database is already initialized
    let state = app_handle.state::<AppState>();
    {
        let db_guard = state.db.lock().await;
        if !db_guard.is_placeholder() {
            println!("Database already initialized, skipping...");
            return Ok("Database already initialized".to_string());
        }
    }

    println!("Initializing database...");

    // Use a database file in the user's home directory to avoid permission issues
    let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let db_path = std::path::PathBuf::from(home_dir).join("isms.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());
    println!("Using database file: {:?}", db_path);
    println!("Database URL: {}", db_url);

    let mut database = Database::new(&db_url).await
        .map_err(|e| {
            println!("Failed to initialize database: {}", e);
            format!("Failed to initialize database: {}", e)
        })?;

    println!("Running database migrations...");
    database.migrate().await
        .map_err(|e| {
            println!("Failed to run migrations: {}", e);
            format!("Failed to run migrations: {}", e)
        })?;

    println!("Database tables created successfully - no mock data seeded");

    // Store database in app state
    let state = app_handle.state::<AppState>();
    *state.db.lock().await = database;

    println!("Database initialized successfully");
    Ok("Database initialized successfully".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Initialize app state with a placeholder database
            // The actual database will be set when init_database is called
            let app_state = AppState {
                db: Arc::new(Mutex::new(Database::create_placeholder())),
            };
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            open_url,
            init_database,
            auth::login,
            auth::logout,
            auth::get_current_user,
            auth::validate_user_session,
            auth::check_user_permission,
            auth::save_user_to_local,
            users::get_users,
            users::create_user,
            users::update_user,
            users::delete_user,
            users::get_roles,
            users::get_permissions,
            inventory::get_products,
            inventory::create_product,
            inventory::update_product,
            inventory::delete_product,
            inventory::update_stock,
            inventory::get_low_stock_products,
            inventory::get_suppliers,
            inventory::create_supplier,
            inventory::update_supplier,
            inventory::delete_supplier,
            inventory::get_inventory_movements,
            pos::search_products_by_sku,
            pos::search_products_by_name,
            pos::create_order,
            pos::complete_order,
            pos::cancel_order,
            pos::get_recent_orders,
            pos::get_order_items,
            pos::process_barcode_scan,
            pos::print_receipt,
            pos::open_cash_drawer,
            notifications::get_notifications,
            notifications::mark_notification_read,
            notifications::get_expiring_products,
            notifications::check_alerts,
            notifications::create_notification,
            reports::get_sales_report,
            reports::get_product_sales_report,
            reports::get_inventory_report,
            reports::get_dashboard_stats,
            reports::export_sales_report,
            reports::export_inventory_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}