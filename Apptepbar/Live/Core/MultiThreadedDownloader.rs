use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use reqwest::Client;
use bytes::Bytes;

#[derive(Debug, Clone)]
pub struct ChunkInfo {
    pub id: usize,
    pub start: u64,
    pub end: u64,
    pub url: String,
    pub data: Option<Bytes>,
}

#[derive(Debug)]
pub struct DownloadProgress {
    pub total_chunks: usize,
    pub completed_chunks: usize,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
}

pub struct MultiThreadedDownloader {
    client: Client,
    max_concurrent: usize,
    chunk_size: usize,
    semaphore: Arc<Semaphore>,
}

impl MultiThreadedDownloader {
    pub fn new(max_concurrent: usize, chunk_size: usize) -> Self {
        let client = Client::builder()
            .http3_prior_knowledge()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            max_concurrent,
            chunk_size,
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        }
    }

    pub async fn download_video(&self, video_url: &str, total_size: u64) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let chunks = self.create_chunks(video_url, total_size);
        let progress = Arc::new(Mutex::new(DownloadProgress {
            total_chunks: chunks.len(),
            completed_chunks: 0,
            downloaded_bytes: 0,
            total_bytes,
            speed_bps: 0.0,
        }));

        let mut join_set = JoinSet::new();
        let chunk_map: Arc<Mutex<HashMap<usize, ChunkInfo>>> = Arc::new(Mutex::new(HashMap::new()));

        // Start parallel downloading with 10 HTTP/3 streams
        for chunk in chunks {
            let client = self.client.clone();
            let semaphore = Arc::clone(&self.semaphore);
            let chunk_map = Arc::clone(&chunk_map);
            let progress = Arc::clone(&progress);

            join_set.spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();
                let start_time = Instant::now();
                
                match Self::download_chunk(&client, &chunk).await {
                    Ok(data) => {
                        let duration = start_time.elapsed();
                        let speed = data.len() as f64 / duration.as_secs_f64();
                        
                        chunk_map.lock().unwrap().insert(chunk.id, ChunkInfo {
                            id: chunk.id,
                            start: chunk.start,
                            end: chunk.end,
                            url: chunk.url.clone(),
                            data: Some(data),
                        });

                        // Update progress
                        let mut prog = progress.lock().unwrap();
                        prog.completed_chunks += 1;
                        prog.downloaded_bytes += data.len() as u64;
                        prog.speed_bps = speed;
                        
                        println!("Chunk {}/{} downloaded ({} MB/s)", 
                                prog.completed_chunks, prog.total_chunks, 
                                speed / 1_048_576.0);
                    }
                    Err(e) => {
                        eprintln!("Failed to download chunk {}: {}", chunk.id, e);
                    }
                }
            });
        }

        // Wait for all downloads to complete
        while let Some(result) = join_set.join_next().await {
            if let Err(e) = result {
                eprintln!("Task failed: {}", e);
            }
        }

        // Assemble chunks in order
        let mut sorted_chunks: Vec<_> = chunk_map.lock().unwrap().values().cloned().collect();
        sorted_chunks.sort_by_key(|c| c.id);
        
        let mut video_data = Vec::with_capacity(total_size as usize);
        for chunk in sorted_chunks {
            if let Some(data) = chunk.data {
                video_data.extend_from_slice(&data);
            }
        }

        Ok(video_data)
    }

    fn create_chunks(&self, video_url: &str, total_size: u64) -> Vec<ChunkInfo> {
        let mut chunks = Vec::new();
        let mut current_pos = 0u64;
        let mut chunk_id = 0usize;

        while current_pos < total_size {
            let end = std::cmp::min(current_pos + self.chunk_size as u64 - 1, total_size);
            
            chunks.push(ChunkInfo {
                id: chunk_id,
                start: current_pos,
                end,
                url: video_url.to_string(),
                data: None,
            });

            current_pos = end + 1;
            chunk_id += 1;
        }

        chunks
    }

    async fn download_chunk(client: &Client, chunk: &ChunkInfo) -> Result<Bytes, Box<dyn std::error::Error>> {
        let response = client
            .get(&chunk.url)
            .header("Range", format!("bytes={}-{}", chunk.start, chunk.end))
            .header("User-Agent", "Kronop-Live/1.0")
            .send()
            .await?;

        if response.status().is_success() {
            let data = response.bytes().await?;
            Ok(data)
        } else {
            Err(format!("HTTP {}: {}", response.status(), response.text().await?).into())
        }
    }

    pub fn get_progress(&self, progress: &DownloadProgress) -> String {
        let percent = (progress.completed_chunks as f64 / progress.total_chunks as f64) * 100.0;
        let speed_mb = progress.speed_bps / 1_048_576.0;
        format!(
            "Progress: {:.1}% | Speed: {:.2} MB/s | Chunks: {}/{}",
            percent, speed_mb, progress.completed_chunks, progress.total_chunks
        )
    }
}

// Buffer management for smooth playback
pub struct VideoBuffer {
    chunks: Arc<Mutex<HashMap<usize, Bytes>>>,
    next_chunk_id: Arc<Mutex<usize>>,
    buffer_size: usize,
}

impl VideoBuffer {
    pub fn new(buffer_size: usize) -> Self {
        Self {
            chunks: Arc::new(Mutex::new(HashMap::new())),
            next_chunk_id: Arc::new(Mutex::new(0)),
            buffer_size,
        }
    }

    pub fn add_chunk(&self, chunk_id: usize, data: Bytes) {
        let mut chunks = self.chunks.lock().unwrap();
        chunks.insert(chunk_id, data);
        
        // Clean old chunks if buffer is full
        if chunks.len() > self.buffer_size {
            let mut next_id = self.next_chunk_id.lock().unwrap();
            if let Some(old_chunk) = chunks.get(&next_id) {
                let old_size = old_chunk.len();
                chunks.remove(&next_id);
                next_id += 1;
                println!("Removed chunk {} from buffer ({} bytes)", next_id - 1, old_size);
            }
        }
    }

    pub fn get_next_chunk(&self) -> Option<Bytes> {
        let mut next_id = self.next_chunk_id.lock().unwrap();
        let chunks = self.chunks.lock().unwrap();
        
        if let Some(chunk) = chunks.get(&next_id).cloned() {
            *next_id += 1;
            Some(chunk)
        } else {
            None
        }
    }
}
