// Web Worker for parallel video decoding
self.onmessage = async (e) => {
  const { videoData, config } = e.data;
  
  // Initialize Zig decoder
  const decoder = await import('../core/video_engine.zig');
  
  // Process chunks in parallel
  const chunks = [];
  const chunkSize = 1024 * 64; // 64KB chunks
  
  for (let i = 0; i < videoData.length; i += chunkSize) {
    const chunk = videoData.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  
  // Parallel decoding
  const decodedChunks = await Promise.all(
    chunks.map(chunk => decoder.processFrame(chunk))
  );
  
  // Merge results
  const result = new Uint8Array(
    decodedChunks.reduce((acc, chunk) => [...acc, ...chunk], [])
  );
  
  self.postMessage({ 
    decoded: result,
    time: performance.now() 
  }, [result.buffer]);
};
