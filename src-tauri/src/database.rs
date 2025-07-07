use sqlx::{SqlitePool, Row};
use anyhow::Result;
use crate::models::*;

#[derive(Clone)]
pub struct Database {
    pub pool: Option<SqlitePool>,
}

impl Default for Database {
    fn default() -> Self {
        Self { pool: None }
    }
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = SqlitePool::connect(database_url).await?;
        Ok(Self { pool: Some(pool) })
    }

    pub fn create_placeholder() -> Self {
        Self { pool: None }
    }

    pub fn is_placeholder(&self) -> bool {
        self.pool.is_none()
    }

    pub async fn migrate(&mut self) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;
        
        // Create tables - Updated to match online API schema exactly
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                email VARCHAR NOT NULL UNIQUE,
                hashed_password VARCHAR NOT NULL,
                full_name VARCHAR NOT NULL,
                role VARCHAR NOT NULL,
                is_active BOOLEAN NOT NULL,
                is_superuser BOOLEAN NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                name VARCHAR NOT NULL,
                description VARCHAR NOT NULL,
                sku VARCHAR NOT NULL UNIQUE,
                category VARCHAR(13) NOT NULL,
                price FLOAT NOT NULL,
                cost FLOAT NOT NULL,
                quantity INTEGER NOT NULL,
                reorder_level INTEGER NOT NULL,
                supplier_id INTEGER,
                FOREIGN KEY(supplier_id) REFERENCES suppliers (id)
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                name VARCHAR NOT NULL,
                contact_name VARCHAR NOT NULL,
                email VARCHAR NOT NULL,
                phone VARCHAR NOT NULL,
                address VARCHAR NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                customer_name VARCHAR NOT NULL,
                total_amount FLOAT NOT NULL,
                payment_method VARCHAR(14) NOT NULL,
                status VARCHAR(9) NOT NULL,
                cashier_id INTEGER,
                FOREIGN KEY(cashier_id) REFERENCES users (id)
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price FLOAT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders (id),
                FOREIGN KEY(product_id) REFERENCES products (id)
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                movement_type VARCHAR(10) NOT NULL,
                notes VARCHAR NOT NULL,
                FOREIGN KEY(product_id) REFERENCES products (id)
            )
            "#,
        )
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                product_id INTEGER,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create sync queue table for offline operations
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                created_at DATETIME NOT NULL,
                operation_type VARCHAR NOT NULL,
                endpoint VARCHAR NOT NULL,
                method VARCHAR NOT NULL,
                payload TEXT NOT NULL,
                retries INTEGER NOT NULL DEFAULT 0,
                last_attempt_at DATETIME,
                error_message TEXT
            )
            "#,
        )
        .execute(pool)
        .await?;

        println!("Database tables created successfully");
        Ok(())
    }

    // Database initialization complete - no mock data seeded
    // All data will be fetched from the online API after authentication

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;
        
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = ?"
        )
        .bind(email)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn get_user_permissions(&self, user_id: i64) -> Result<Vec<String>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;
        
        let permissions = sqlx::query(
            r#"
            SELECT p.name 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            JOIN users u ON u.role = r.name
            WHERE u.id = ?
            "#
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(permissions.into_iter().map(|row| row.get::<String, _>(0)).collect())
    }

    // User management methods
    pub async fn get_all_users(&self) -> Result<Vec<User>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let users = sqlx::query_as::<_, User>(
            "SELECT * FROM users ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(users)
    }

    pub async fn create_user(&self, email: &str, full_name: &str, role: &str, password: &str) -> Result<i64> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)?;

        let result = sqlx::query(
            "INSERT INTO users (email, full_name, role, password_hash) VALUES (?, ?, ?, ?)"
        )
        .bind(email)
        .bind(full_name)
        .bind(role)
        .bind(password_hash)
        .execute(pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn update_user(&self, user_id: i64, email: &str, full_name: &str, role: &str) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query(
            "UPDATE users SET email = ?, full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(email)
        .bind(full_name)
        .bind(role)
        .bind(user_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn delete_user(&self, user_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn get_all_roles(&self) -> Result<Vec<Role>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let roles = sqlx::query_as::<_, Role>(
            "SELECT * FROM roles ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        Ok(roles)
    }

    pub async fn get_all_permissions(&self) -> Result<Vec<Permission>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let permissions = sqlx::query_as::<_, Permission>(
            "SELECT * FROM permissions ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        Ok(permissions)
    }

    // Product management methods
    pub async fn get_all_products(&self) -> Result<Vec<Product>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        Ok(products)
    }

    pub async fn create_product(&self, product: CreateProductRequest) -> Result<i64> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let result = sqlx::query(
            "INSERT INTO products (name, description, sku, category, price, cost, quantity, reorder_level, expiry_date, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&product.name)
        .bind(&product.description)
        .bind(&product.sku)
        .bind(&product.category)
        .bind(product.price)
        .bind(product.cost)
        .bind(product.quantity)
        .bind(product.reorder_level)
        .bind(&product.expiry_date)
        .bind(product.supplier_id)
        .execute(pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn update_product(&self, product_id: i64, product: CreateProductRequest) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query(
            "UPDATE products SET name = ?, description = ?, sku = ?, category = ?, price = ?, cost = ?, quantity = ?, reorder_level = ?, expiry_date = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(&product.name)
        .bind(&product.description)
        .bind(&product.sku)
        .bind(&product.category)
        .bind(product.price)
        .bind(product.cost)
        .bind(product.quantity)
        .bind(product.reorder_level)
        .bind(&product.expiry_date)
        .bind(product.supplier_id)
        .bind(product_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn delete_product(&self, product_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query("DELETE FROM products WHERE id = ?")
            .bind(product_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn update_stock(&self, product_id: i64, stock_update: UpdateStockRequest) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        // Start a transaction
        let mut tx = pool.begin().await?;

        // Update product quantity
        sqlx::query(
            "UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(stock_update.quantity_change)
        .bind(product_id)
        .execute(&mut *tx)
        .await?;

        // Record inventory movement
        sqlx::query(
            "INSERT INTO inventory_movements (product_id, quantity_change, movement_type, notes) VALUES (?, ?, ?, ?)"
        )
        .bind(product_id)
        .bind(stock_update.quantity_change)
        .bind(&stock_update.movement_type)
        .bind(&stock_update.notes)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_low_stock_products(&self) -> Result<Vec<Product>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE quantity <= reorder_level ORDER BY quantity ASC"
        )
        .fetch_all(pool)
        .await?;

        Ok(products)
    }

    // Supplier management methods
    pub async fn get_all_suppliers(&self) -> Result<Vec<Supplier>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let suppliers = sqlx::query_as::<_, Supplier>(
            "SELECT * FROM suppliers ORDER BY name"
        )
        .fetch_all(pool)
        .await?;

        Ok(suppliers)
    }

    pub async fn create_supplier(&self, name: &str, contact_name: Option<&str>, email: Option<&str>, phone: Option<&str>, address: Option<&str>) -> Result<i64> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let result = sqlx::query(
            "INSERT INTO suppliers (name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(name)
        .bind(contact_name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .execute(pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn update_supplier(&self, supplier_id: i64, name: &str, contact_name: Option<&str>, email: Option<&str>, phone: Option<&str>, address: Option<&str>) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query(
            "UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(name)
        .bind(contact_name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .bind(supplier_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn delete_supplier(&self, supplier_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query("DELETE FROM suppliers WHERE id = ?")
            .bind(supplier_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    // Inventory movements
    pub async fn get_inventory_movements(&self, product_id: Option<i64>) -> Result<Vec<InventoryMovement>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let movements = if let Some(pid) = product_id {
            sqlx::query_as::<_, InventoryMovement>(
                "SELECT * FROM inventory_movements WHERE product_id = ? ORDER BY timestamp DESC"
            )
            .bind(pid)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, InventoryMovement>(
                "SELECT * FROM inventory_movements ORDER BY timestamp DESC LIMIT 100"
            )
            .fetch_all(pool)
            .await?
        };

        Ok(movements)
    }

    // POS-related methods
    pub async fn get_product_by_sku(&self, sku: &str) -> Result<Option<Product>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let product = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE sku = ?"
        )
        .bind(sku)
        .fetch_optional(pool)
        .await?;

        Ok(product)
    }

    pub async fn search_products_by_name(&self, query: &str) -> Result<Vec<Product>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let search_pattern = format!("%{}%", query);
        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? ORDER BY name LIMIT 20"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(pool)
        .await?;

        Ok(products)
    }

    pub async fn create_order(&self, order_data: CreateOrderRequest) -> Result<i64> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        // Start a transaction
        let mut tx = pool.begin().await?;

        // Calculate total amount
        let total_amount: f64 = order_data.items.iter()
            .map(|item| item.price_at_sale * item.quantity as f64)
            .sum();

        // Create order
        let order_result = sqlx::query(
            "INSERT INTO orders (customer_name, payment_method, total_amount, status) VALUES (?, ?, ?, 'pending')"
        )
        .bind(&order_data.customer_name)
        .bind(&order_data.payment_method)
        .bind(total_amount)
        .execute(&mut *tx)
        .await?;

        let order_id = order_result.last_insert_rowid();

        // Create order items and update stock
        for item in order_data.items {
            // Insert order item
            sqlx::query(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)"
            )
            .bind(order_id)
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(item.price_at_sale)
            .execute(&mut *tx)
            .await?;

            // Update product stock
            sqlx::query(
                "UPDATE products SET quantity = quantity - ? WHERE id = ?"
            )
            .bind(item.quantity)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await?;

            // Record inventory movement
            sqlx::query(
                "INSERT INTO inventory_movements (product_id, quantity_change, movement_type, notes) VALUES (?, ?, 'sale', ?)"
            )
            .bind(item.product_id)
            .bind(-item.quantity)
            .bind(format!("Sale - Order #{}", order_id))
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(order_id)
    }

    pub async fn complete_order(&self, order_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query(
            "UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(order_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn cancel_order(&self, order_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        // Start a transaction
        let mut tx = pool.begin().await?;

        // Get order items to restore stock
        let order_items = sqlx::query_as::<_, OrderItem>(
            "SELECT * FROM order_items WHERE order_id = ?"
        )
        .bind(order_id)
        .fetch_all(&mut *tx)
        .await?;

        // Restore stock for each item
        for item in order_items {
            sqlx::query(
                "UPDATE products SET quantity = quantity + ? WHERE id = ?"
            )
            .bind(item.quantity)
            .bind(item.product_id)
            .execute(&mut *tx)
            .await?;

            // Record inventory movement
            sqlx::query(
                "INSERT INTO inventory_movements (product_id, quantity_change, movement_type, notes) VALUES (?, ?, 'return', ?)"
            )
            .bind(item.product_id)
            .bind(item.quantity)
            .bind(format!("Order cancellation - Order #{}", order_id))
            .execute(&mut *tx)
            .await?;
        }

        // Update order status
        sqlx::query(
            "UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .bind(order_id)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_recent_orders(&self, limit: i64) -> Result<Vec<Order>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let orders = sqlx::query_as::<_, Order>(
            "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(orders)
    }

    pub async fn get_order_items(&self, order_id: i64) -> Result<Vec<OrderItem>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let items = sqlx::query_as::<_, OrderItem>(
            "SELECT * FROM order_items WHERE order_id = ?"
        )
        .bind(order_id)
        .fetch_all(pool)
        .await?;

        Ok(items)
    }

    // Notification management methods
    pub async fn create_notification(&self, user_id: Option<i64>, title: &str, message: &str, notification_type: &str, priority: &str, product_id: Option<i64>) -> Result<i64> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let result = sqlx::query(
            "INSERT INTO notifications (user_id, title, message, type, priority, product_id) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(title)
        .bind(message)
        .bind(notification_type)
        .bind(priority)
        .bind(product_id)
        .execute(pool)
        .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn get_notifications(&self, user_id: Option<i64>, unread_only: bool) -> Result<Vec<Notification>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let notifications = if let Some(uid) = user_id {
            if unread_only {
                sqlx::query_as::<_, Notification>(
                    "SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE ORDER BY created_at DESC"
                )
                .bind(uid)
                .fetch_all(pool)
                .await?
            } else {
                sqlx::query_as::<_, Notification>(
                    "SELECT * FROM notifications WHERE (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT 50"
                )
                .bind(uid)
                .fetch_all(pool)
                .await?
            }
        } else {
            if unread_only {
                sqlx::query_as::<_, Notification>(
                    "SELECT * FROM notifications WHERE is_read = FALSE ORDER BY created_at DESC"
                )
                .fetch_all(pool)
                .await?
            } else {
                sqlx::query_as::<_, Notification>(
                    "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50"
                )
                .fetch_all(pool)
                .await?
            }
        };

        Ok(notifications)
    }

    pub async fn mark_notification_read(&self, notification_id: i64) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        sqlx::query("UPDATE notifications SET is_read = TRUE WHERE id = ?")
            .bind(notification_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn get_expiring_products(&self, days_ahead: i32) -> Result<Vec<Product>> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+' || ? || ' days') ORDER BY expiry_date ASC"
        )
        .bind(days_ahead)
        .fetch_all(pool)
        .await?;

        Ok(products)
    }

    pub async fn check_and_create_alerts(&self) -> Result<()> {
        let pool = self.pool.as_ref().ok_or_else(|| anyhow::anyhow!("Database not initialized"))?;

        // Check for low stock products
        let low_stock_products = self.get_low_stock_products().await?;
        for product in low_stock_products {
            // Check if we already have a recent notification for this product
            let existing = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM notifications WHERE product_id = ? AND type = 'low_stock' AND created_at > datetime('now', '-1 day')"
            )
            .bind(product.id)
            .fetch_one(pool)
            .await?;

            if existing == 0 {
                self.create_notification(
                    None, // Send to all managers/admins
                    "Low Stock Alert",
                    &format!("Product '{}' is running low. Current stock: {}, Reorder level: {}",
                            product.name, product.quantity, product.reorder_level),
                    "low_stock",
                    "high",
                    Some(product.id)
                ).await?;
            }
        }

        // Check for expiring products (within 7 days)
        let expiring_products = self.get_expiring_products(7).await?;
        for product in expiring_products {
            // Check if we already have a recent notification for this product
            let existing = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM notifications WHERE product_id = ? AND type = 'expiry_warning' AND created_at > datetime('now', '-1 day')"
            )
            .bind(product.id)
            .fetch_one(pool)
            .await?;

            if existing == 0 {
                // Note: Expiry date functionality removed to match online API schema
                // This notification is now for low stock only
                self.create_notification(
                    None, // Send to all managers/admins
                    "Low Stock Alert",
                    &format!("Product '{}' is running low. Current stock: {}, Reorder level: {}",
                            product.name, product.quantity, product.reorder_level),
                    "low_stock",
                    "medium",
                    Some(product.id)
                ).await?;
            }
        }

        Ok(())
    }

    // Report methods - using simple mock data for now
    pub async fn get_sales_by_date_range(&self, _start_date: &str, _end_date: &str) -> Result<Vec<super::reports::SalesReport>> {
        // Return mock data for now
        Ok(vec![
            super::reports::SalesReport {
                date: "2024-01-01".to_string(),
                total_sales: 1250.50,
                total_orders: 15,
                average_order_value: 83.37,
            },
            super::reports::SalesReport {
                date: "2024-01-02".to_string(),
                total_sales: 980.25,
                total_orders: 12,
                average_order_value: 81.69,
            },
        ])
    }

    pub async fn get_product_sales_by_date_range(&self, _start_date: &str, _end_date: &str) -> Result<Vec<super::reports::ProductSalesReport>> {
        // Return mock data for now
        Ok(vec![
            super::reports::ProductSalesReport {
                product_id: 1,
                product_name: "Coca Cola 500ml".to_string(),
                quantity_sold: 25,
                total_revenue: 62.50,
            },
            super::reports::ProductSalesReport {
                product_id: 2,
                product_name: "Bread Loaf".to_string(),
                quantity_sold: 15,
                total_revenue: 59.85,
            },
        ])
    }

    pub async fn get_inventory_report(&self) -> Result<super::reports::InventoryReport> {
        // Return mock data for now
        Ok(super::reports::InventoryReport {
            total_products: 5,
            total_value: 1250.75,
            low_stock_count: 2,
            expiring_soon_count: 2,
            categories: vec![
                super::reports::CategoryReport {
                    category: "Beverages".to_string(),
                    product_count: 2,
                    total_value: 245.00,
                },
                super::reports::CategoryReport {
                    category: "Bakery".to_string(),
                    product_count: 1,
                    total_value: 99.75,
                },
                super::reports::CategoryReport {
                    category: "Dairy".to_string(),
                    product_count: 1,
                    total_value: 135.00,
                },
            ],
        })
    }

    pub async fn get_dashboard_stats(&self) -> Result<super::reports::DashboardStats> {
        // Get recent orders using existing method
        let recent_orders = self.get_recent_orders(5).await?;

        // Return mock data for now
        Ok(super::reports::DashboardStats {
            today_sales: 450.75,
            today_orders: 8,
            total_products: 5,
            low_stock_count: 2,
            total_inventory_value: 1250.75,
            recent_orders,
        })
    }
}
