use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// Updated User model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub email: String,
    #[serde(rename = "hashed_password")]
    #[sqlx(rename = "hashed_password")]
    pub password_hash: String,
    pub full_name: String,
    pub role: String,
    pub is_active: bool,
    pub is_superuser: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Permission {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RolePermission {
    pub role_id: i64,
    pub permission_id: i64,
}

// Updated Product model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Product {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub name: String,
    pub description: String,
    pub sku: String,
    pub category: String,
    pub price: f64,
    pub cost: f64,
    pub quantity: i32,
    pub reorder_level: i32,
    pub supplier_id: Option<i64>,
}

// Updated Supplier model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub name: String,
    pub contact_name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
}

// Updated Order model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Order {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub customer_name: String,
    pub total_amount: f64,
    pub payment_method: String,
    pub status: String,
    pub cashier_id: Option<i64>,
}

// Updated OrderItem model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderItem {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub order_id: i64,
    pub product_id: i64,
    pub quantity: i32,
    pub unit_price: f64,
}

// Updated StockMovement model to match online API schema exactly
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StockMovement {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub product_id: i64,
    pub quantity: i32,
    pub movement_type: String,
    pub notes: String,
}

// Keep InventoryMovement as alias for backward compatibility
pub type InventoryMovement = StockMovement;

// Sync Queue model for offline operations
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncQueue {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub operation_type: String,
    pub endpoint: String,
    pub method: String,
    pub payload: String,
    pub retries: i32,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
}

// DTOs for API requests/responses
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub user: UserInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: i64,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: Option<String>,
    pub sku: String,
    pub category: String,
    pub price: f64,
    pub cost: f64,
    pub quantity: i32,
    pub reorder_level: i32,
    pub expiry_date: Option<String>,
    pub supplier_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateStockRequest {
    pub quantity_change: i32,
    pub movement_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_name: Option<String>,
    pub payment_method: String,
    pub items: Vec<OrderItemRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItemRequest {
    pub product_id: i64,
    pub quantity: i32,
    pub price_at_sale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    pub id: i64,
    pub user_id: Option<i64>,
    pub title: String,
    pub message: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub notification_type: String,
    pub priority: String,
    pub is_read: bool,
    pub product_id: Option<i64>,
    pub created_at: DateTime<Utc>,
}
