use reqwest::header::{RANGE, AUTHORIZATION};
use std::error::Error;

/// RangeRequestManager for handling HTTP range requests to Cloudflare R2
pub struct RangeRequestManager {
    client: reqwest::Client,
    endpoint: String,
    bucket: String,
    access_key: String,
    secret_key: String,
}

impl RangeRequestManager {
    /// Create a new RangeRequestManager
    pub fn new(endpoint: String, bucket: String, access_key: String, secret_key: String) -> Self {
        RangeRequestManager {
            client: reqwest::Client::new(),
            endpoint,
            bucket,
            access_key,
            secret_key,
        }
    }

    /// Download a range of bytes from R2 object
    pub async fn download_range(&self, key: &str, start: u64, end: u64) -> Result<Vec<u8>, Box<dyn Error>> {
        let url = format!("{}/{}/{}", self.endpoint, self.bucket, key);
        let range_header = format!("bytes={}-{}", start, end);

        let response = self.client
            .get(&url)
            .header(RANGE, range_header)
            .header(AUTHORIZATION, self.generate_auth_header())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()).into());
        }

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// Download entire object if needed
    pub async fn download_full(&self, key: &str) -> Result<Vec<u8>, Box<dyn Error>> {
        let url = format!("{}/{}/{}", self.endpoint, self.bucket, key);

        let response = self.client
            .get(&url)
            .header(AUTHORIZATION, self.generate_auth_header())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()).into());
        }

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// Generate AWS S3-compatible authorization header
    fn generate_auth_header(&self) -> String {
        // Simplified auth header generation
        // In production, use proper AWS SDK or library for signing
        format!("AWS4-HMAC-SHA256 Credential={}/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-date, Signature=fake_signature", self.access_key)
    }

    /// Check if object exists
    pub async fn object_exists(&self, key: &str) -> Result<bool, Box<dyn Error>> {
        let url = format!("{}/{}/{}", self.endpoint, self.bucket, key);

        let response = self.client
            .head(&url)
            .header(AUTHORIZATION, self.generate_auth_header())
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}
