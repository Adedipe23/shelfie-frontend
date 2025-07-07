use anyhow::Result;
use reqwest::{Client, Method, Response};
use serde_json::Value;
use std::collections::HashMap;

/// API Proxy for making HTTP requests to the online backend
/// Handles authentication, request construction, and response parsing
#[derive(Clone)]
pub struct ApiProxy {
    client: Client,
    base_url: String,
}

impl ApiProxy {
    /// Create a new API proxy instance
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "https://api.isms.helevon.org/api/v1".to_string(),
        }
    }

    /// Make a generic API request to the online backend
    /// 
    /// # Arguments
    /// * `method` - HTTP method (GET, POST, PUT, DELETE)
    /// * `endpoint` - API endpoint path (e.g., "/users/", "/products/")
    /// * `token` - Optional authentication token
    /// * `payload` - Optional JSON payload for POST/PUT requests
    /// 
    /// # Returns
    /// * `Ok(Value)` - JSON response from the API
    /// * `Err(anyhow::Error)` - Network error, HTTP error, or parsing error
    pub async fn make_api_request(
        &self,
        method: Method,
        endpoint: &str,
        token: Option<&str>,
        payload: Option<Value>,
    ) -> Result<Value> {
        let url = format!("{}{}", self.base_url, endpoint);
        
        let mut request = self.client.request(method, &url);

        // Add authentication header if token is provided
        if let Some(token) = token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        // Add JSON payload for POST/PUT requests
        if let Some(payload) = payload {
            request = request
                .header("Content-Type", "application/json")
                .json(&payload);
        }

        // Send the request
        let response: Response = request.send().await?;

        // Check if the response is successful
        if response.status().is_success() {
            let json_response: Value = response.json().await?;
            Ok(json_response)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(anyhow::anyhow!("HTTP {} - {}", status, error_text))
        }
    }

    /// Convenience method for GET requests
    pub async fn get(&self, endpoint: &str, token: Option<&str>) -> Result<Value> {
        self.make_api_request(Method::GET, endpoint, token, None).await
    }

    /// Convenience method for POST requests
    pub async fn post(&self, endpoint: &str, token: Option<&str>, payload: Value) -> Result<Value> {
        self.make_api_request(Method::POST, endpoint, token, Some(payload)).await
    }

    /// Convenience method for PUT requests
    pub async fn put(&self, endpoint: &str, token: Option<&str>, payload: Value) -> Result<Value> {
        self.make_api_request(Method::PUT, endpoint, token, Some(payload)).await
    }

    /// Convenience method for DELETE requests
    pub async fn delete(&self, endpoint: &str, token: Option<&str>) -> Result<Value> {
        self.make_api_request(Method::DELETE, endpoint, token, None).await
    }

    /// Check if the online API is reachable
    pub async fn check_connectivity(&self) -> bool {
        match self.client.get(&format!("{}/health", self.base_url)).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    /// Get the base URL for the API
    pub fn get_base_url(&self) -> &str {
        &self.base_url
    }
}

impl Default for ApiProxy {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_api_proxy_creation() {
        let proxy = ApiProxy::new();
        assert_eq!(proxy.get_base_url(), "https://api.isms.helevon.org/api/v1");
    }

    #[tokio::test]
    async fn test_connectivity_check() {
        let proxy = ApiProxy::new();
        // This will fail if the backend is not running, which is expected in tests
        let _is_connected = proxy.check_connectivity().await;
        // We don't assert here since the backend might not be running during tests
    }
}
