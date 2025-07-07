use anyhow::Result;
use chrono::{DateTime, Utc};
use reqwest::Method;
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;

use crate::api_proxy::ApiProxy;
use crate::database::Database;
use crate::models::SyncQueue;

/// Maximum number of retry attempts for sync operations
const MAX_RETRIES: i32 = 5;

/// Interval between sync attempts (in seconds)
const SYNC_INTERVAL_SECONDS: u64 = 30;

/// Sync Service for managing offline operations and synchronization
pub struct SyncService {
    database: Arc<Mutex<Database>>,
    api_proxy: ApiProxy,
    is_running: Arc<Mutex<bool>>,
}

impl SyncService {
    /// Create a new sync service instance
    pub fn new(database: Arc<Mutex<Database>>) -> Self {
        Self {
            database,
            api_proxy: ApiProxy::new(),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the background sync service
    pub async fn start(&self) -> Result<()> {
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            return Ok(()); // Already running
        }
        *is_running = true;
        drop(is_running);

        let database = Arc::clone(&self.database);
        let api_proxy = self.api_proxy.clone();
        let is_running = Arc::clone(&self.is_running);

        tokio::spawn(async move {
            loop {
                // Check if we should continue running
                {
                    let running = is_running.lock().await;
                    if !*running {
                        break;
                    }
                }

                // Check online status and process sync queue
                if api_proxy.check_connectivity().await {
                    if let Err(e) = Self::process_sync_queue(&database, &api_proxy).await {
                        eprintln!("Sync error: {}", e);
                    }
                }

                // Wait before next sync attempt
                sleep(Duration::from_secs(SYNC_INTERVAL_SECONDS)).await;
            }
        });

        Ok(())
    }

    /// Stop the background sync service
    pub async fn stop(&self) {
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
    }

    /// Add an operation to the sync queue
    pub async fn queue_operation(
        &self,
        operation_type: &str,
        endpoint: &str,
        method: &str,
        payload: Value,
    ) -> Result<()> {
        let database = self.database.lock().await;
        
        if let Some(pool) = &database.pool {
            sqlx::query(
                r#"
                INSERT INTO sync_queue (created_at, operation_type, endpoint, method, payload)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(Utc::now())
            .bind(operation_type)
            .bind(endpoint)
            .bind(method)
            .bind(payload.to_string())
            .execute(pool)
            .await?;
        }

        Ok(())
    }

    /// Process all items in the sync queue
    async fn process_sync_queue(
        database: &Arc<Mutex<Database>>,
        api_proxy: &ApiProxy,
    ) -> Result<()> {
        let db = database.lock().await;
        
        if let Some(pool) = &db.pool {
            // Get all pending sync operations
            let sync_items: Vec<SyncQueue> = sqlx::query_as(
                "SELECT * FROM sync_queue ORDER BY created_at ASC"
            )
            .fetch_all(pool)
            .await?;

            drop(db); // Release the lock

            for item in sync_items {
                match Self::process_sync_item(database, api_proxy, &item).await {
                    Ok(_) => {
                        // Remove successful item from queue
                        let db = database.lock().await;
                        if let Some(pool) = &db.pool {
                            sqlx::query("DELETE FROM sync_queue WHERE id = ?")
                                .bind(item.id)
                                .execute(pool)
                                .await?;
                        }
                    }
                    Err(e) => {
                        // Update retry count and error message
                        let new_retries = item.retries + 1;
                        
                        if new_retries >= MAX_RETRIES {
                            // Remove item after max retries
                            let db = database.lock().await;
                            if let Some(pool) = &db.pool {
                                sqlx::query("DELETE FROM sync_queue WHERE id = ?")
                                    .bind(item.id)
                                    .execute(pool)
                                    .await?;
                            }
                            eprintln!("Sync item {} exceeded max retries and was removed", item.id);
                        } else {
                            // Update retry count and error message
                            let db = database.lock().await;
                            if let Some(pool) = &db.pool {
                                sqlx::query(
                                    "UPDATE sync_queue SET retries = ?, last_attempt_at = ?, error_message = ? WHERE id = ?"
                                )
                                .bind(new_retries)
                                .bind(Utc::now())
                                .bind(e.to_string())
                                .bind(item.id)
                                .execute(pool)
                                .await?;
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Process a single sync queue item
    async fn process_sync_item(
        database: &Arc<Mutex<Database>>,
        api_proxy: &ApiProxy,
        item: &SyncQueue,
    ) -> Result<()> {
        let method = match item.method.as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            _ => return Err(anyhow::anyhow!("Unsupported HTTP method: {}", item.method)),
        };

        let payload: Option<Value> = if item.method == "POST" || item.method == "PUT" {
            Some(serde_json::from_str(&item.payload)?)
        } else {
            None
        };

        // For now, we'll use a placeholder token - in a real implementation,
        // you'd get the current user's token from the auth system
        let token = None; // TODO: Get actual auth token

        let response = api_proxy
            .make_api_request(method, &item.endpoint, token, payload)
            .await?;

        // Handle response based on operation type
        Self::handle_sync_response(database, &item.operation_type, response).await?;

        Ok(())
    }

    /// Handle the response from a sync operation
    async fn handle_sync_response(
        _database: &Arc<Mutex<Database>>,
        operation_type: &str,
        response: Value,
    ) -> Result<()> {
        // Update local database with response data if needed
        match operation_type {
            "product_create" | "user_create" | "order_create" => {
                // For CREATE operations, update the local record with the ID from the server
                if let Some(id) = response.get("id") {
                    println!("Created {} with server ID: {}", operation_type, id);
                    // TODO: Update local record with server ID
                }
            }
            "product_update" | "user_update" | "order_update" => {
                // For UPDATE operations, ensure local data matches server response
                println!("Updated {} successfully", operation_type);
            }
            "product_delete" | "user_delete" | "order_delete" => {
                // For DELETE operations, ensure local record is removed
                println!("Deleted {} successfully", operation_type);
            }
            _ => {
                println!("Processed {} operation", operation_type);
            }
        }

        Ok(())
    }

    /// Get sync queue status
    pub async fn get_sync_status(&self) -> Result<Value> {
        let database = self.database.lock().await;
        
        if let Some(pool) = &database.pool {
            let queue_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_queue")
                .fetch_one(pool)
                .await?;

            let failed_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sync_queue WHERE retries >= ?"
            )
            .bind(MAX_RETRIES)
            .fetch_one(pool)
            .await?;

            Ok(json!({
                "queue_count": queue_count,
                "failed_count": failed_count,
                "is_online": self.api_proxy.check_connectivity().await
            }))
        } else {
            Err(anyhow::anyhow!("Database not initialized"))
        }
    }
}
