use std::collections::VecDeque;

/// BufferManager for reliable chunked data downloads from Cloudflare R2
pub struct BufferManager {
    buffer: VecDeque<Vec<u8>>,
    max_size: usize,
    current_size: usize,
}

impl BufferManager {
    /// Create a new BufferManager with maximum buffer size in bytes
    pub fn new(max_size: usize) -> Self {
        BufferManager {
            buffer: VecDeque::new(),
            max_size,
            current_size: 0,
        }
    }

    /// Add a chunk to the buffer
    pub fn add_chunk(&mut self, chunk: Vec<u8>) {
        let chunk_size = chunk.len();
        if self.current_size + chunk_size > self.max_size {
            // Evict old chunks to make space
            while self.current_size + chunk_size > self.max_size && !self.buffer.is_empty() {
                if let Some(old_chunk) = self.buffer.pop_front() {
                    self.current_size -= old_chunk.len();
                }
            }
        }

        if self.current_size + chunk_size <= self.max_size {
            self.buffer.push_back(chunk);
            self.current_size += chunk_size;
        }
    }

    /// Get the next chunk from the buffer
    pub fn get_chunk(&mut self) -> Option<Vec<u8>> {
        if let Some(chunk) = self.buffer.pop_front() {
            self.current_size -= chunk.len();
            Some(chunk)
        } else {
            None
        }
    }

    /// Check if buffer is empty
    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    /// Get current buffer size
    pub fn size(&self) -> usize {
        self.current_size
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.clear();
        self.current_size = 0;
    }
}
