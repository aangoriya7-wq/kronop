# ai_logic.py - Video prediction AI
# Predicts next 2 minutes of video based on user's internet speed

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import asyncio
import aiohttp
import time
import json
import threading
from collections import deque
from dataclasses import dataclass
from typing import List, Tuple, Optional
import logging
import pickle
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class NetworkStats:
    """Network statistics for prediction"""
    timestamp: float
    bandwidth: float  # bytes per second
    latency: float    # milliseconds
    packet_loss: float
    buffer_health: float  # seconds of video buffered

@dataclass
class VideoSegment:
    """Video segment metadata"""
    segment_id: int
    size: int
    duration: float
    bitrate: int
    quality: str
    start_time: float
    
class NetworkPredictor:
    """LSTM-based network predictor"""
    
    def __init__(self, sequence_length: int = 60):
        self.sequence_length = sequence_length
        self.model = self._build_model()
        self.history = deque(maxlen=sequence_length)
        
    def _build_model(self) -> keras.Model:
        """Build LSTM model for network prediction"""
        model = keras.Sequential([
            layers.LSTM(64, return_sequences=True, input_shape=(self.sequence_length, 4)),
            layers.Dropout(0.2),
            layers.LSTM(32, return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(16),
            layers.Dense(8, activation='relu'),
            layers.Dense(3)  # Predict bandwidth, latency, packet_loss
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def add_stats(self, stats: NetworkStats):
        """Add network statistics to history"""
        self.history.append([
            stats.bandwidth / 1_000_000,  # Normalize to MB/s
            stats.latency / 100,           # Normalize to 0-1 scale
            stats.packet_loss,
            stats.buffer_health / 60       # Normalize to 0-1 scale
        ])
    
    def predict_next(self) -> Tuple[float, float, float]:
        """Predict next network conditions"""
        if len(self.history) < self.sequence_length:
            # Not enough data, return current values
            if self.history:
                last = self.history[-1]
                return last[0] * 1_000_000, last[1] * 100, last[2]
            return 5_000_000, 50, 0.01  # Default values
        
        # Prepare input sequence
        sequence = np.array(list(self.history)[-self.sequence_length:])
        sequence = sequence.reshape(1, self.sequence_length, 4)
        
        # Predict
        prediction = self.model.predict(sequence, verbose=0)[0]
        
        # Denormalize
        bandwidth = prediction[0] * 1_000_000
        latency = prediction[1] * 100
        packet_loss = prediction[2]
        
        return bandwidth, latency, packet_loss

class VideoPredictor:
    """Predicts which video segments to preload"""
    
    def __init__(self, segment_duration: float = 10.0):
        self.segment_duration = segment_duration
        self.viewing_patterns = deque(maxlen=1000)
        self.quality_preferences = {}
        
    def predict_segments(self, current_time: float, 
                        network_bandwidth: float,
                        buffer_health: float) -> List[int]:
        """Predict which segments to load next"""
        # Calculate how many segments we can load based on bandwidth
        bytes_per_second = network_bandwidth
        seconds_to_preload = min(120, buffer_health + 30)  # Max 2 minutes ahead
        bytes_available = bytes_per_second * seconds_to_preload
        
        # Analyze viewing patterns
        segments_to_load = []
        current_segment = int(current_time / self.segment_duration)
        
        # Based on historical patterns, determine likely skip points
        skip_probability = self._calculate_skip_probability(current_segment)
        
        if skip_probability < 0.3:
            # User likely to watch sequentially
            for i in range(1, 13):  # Next 12 segments (~2 minutes at 10s each)
                segment_id = current_segment + i
                segments_to_load.append(segment_id)
        else:
            # User might skip, load key segments
            segments_to_load = self._load_key_segments(current_segment, 12)
        
        return segments_to_load[:12]  # Limit to 12 segments
    
    def _calculate_skip_probability(self, segment_id: int) -> float:
        """Calculate probability that user will skip"""
        if not self.viewing_patterns:
            return 0.1
        
        # Analyze similar segments in history
        similar_views = [p for p in self.viewing_patterns 
                        if abs(p[0] - segment_id) < 5]
        
        if not similar_views:
            return 0.1
        
        skip_count = sum(1 for p in similar_views if p[1] > self.segment_duration * 1.5)
        return skip_count / len(similar_views)
    
    def _load_key_segments(self, current_segment: int, count: int) -> List[int]:
        """Load key segments (chapters, scene changes)"""
        # This would analyze video metadata for scene changes
        # For now, load every 3rd segment
        return [current_segment + i for i in range(1, count * 3, 3)]

class QualityOptimizer:
    """Optimizes video quality based on network conditions"""
    
    QUALITY_LEVELS = {
        '240p': {'bitrate': 300_000, 'resolution': (426, 240)},
        '360p': {'bitrate': 750_000, 'resolution': (640, 360)},
        '480p': {'bitrate': 1_500_000, 'resolution': (854, 480)},
        '720p': {'bitrate': 3_000_000, 'resolution': (1280, 720)},
        '1080p': {'bitrate': 6_000_000, 'resolution': (1920, 1080)},
        '4K': {'bitrate': 20_000_000, 'resolution': (3840, 2160)}
    }
    
    def __init__(self):
        self.current_quality = '1080p'
        self.quality_history = deque(maxlen=100)
        
    def select_quality(self, bandwidth: float, buffer_health: float) -> str:
        """Select optimal quality based on conditions"""
        # Find highest quality that bandwidth can support
        available_quality = '240p'
        for quality, specs in self.QUALITY_LEVELS.items():
            if bandwidth >= specs['bitrate'] * 1.5:  # 50% headroom
                available_quality = quality
        
        # Don't change quality too frequently
        if self.quality_history and self.quality_history[-1] != available_quality:
            # Wait at least 10 seconds before switching
            if len(self.quality_history) > 10:
                self.quality_history.append(available_quality)
            else:
                return self.current_quality
        else:
            self.quality_history.append(available_quality)
        
        # Ensure smooth transition
        if buffer_health < 5:
            # Low buffer, prioritize stability
            if available_quality != self.current_quality:
                # Drop one level for stability
                quality_levels = list(self.QUALITY_LEVELS.keys())
                current_idx = quality_levels.index(self.current_quality)
                target_idx = quality_levels.index(available_quality)
                
                if target_idx > current_idx:
                    # Increase slowly
                    available_quality = quality_levels[min(current_idx + 1, target_idx)]
                elif target_idx < current_idx:
                    # Decrease quickly
                    available_quality = quality_levels[target_idx]
        
        self.current_quality = available_quality
        return available_quality

class VideoAI:
    """Main AI class coordinating all prediction and optimization"""
    
    def __init__(self):
        self.network_predictor = NetworkPredictor()
        self.video_predictor = VideoPredictor()
        self.quality_optimizer = QualityOptimizer()
        self.running = False
        self.ai_thread = None
        
        # Shared state with other languages
        self.current_bandwidth = 5_000_000  # 5 MB/s default
        self.current_buffer = 0
        self.current_time = 0
        self.predicted_segments = []
        
    def start(self):
        """Start AI prediction loop"""
        self.running = True
        self.ai_thread = threading.Thread(target=self._prediction_loop)
        self.ai_thread.start()
        logger.info("Video AI started")
        
    def stop(self):
        """Stop AI prediction loop"""
        self.running = False
        if self.ai_thread:
            self.ai_thread.join()
        logger.info("Video AI stopped")
    
    def _prediction_loop(self):
        """Main prediction loop running every second"""
        while self.running:
            try:
                # Predict network conditions
                bandwidth, latency, packet_loss = self.network_predictor.predict_next()
                
                # Select optimal quality
                quality = self.quality_optimizer.select_quality(bandwidth, self.current_buffer)
                
                # Predict segments to load
                segments = self.video_predictor.predict_segments(
                    self.current_time, bandwidth, self.current_buffer
                )
                
                # Update predictions
                self.predicted_segments = segments
                
                # Log predictions
                logger.debug(f"Predicted bandwidth: {bandwidth/1_000_000:.1f} MB/s")
                logger.debug(f"Selected quality: {quality}")
                logger.debug(f"Segments to load: {segments[:5]}")
                
                # Communicate with other components (via bridge)
                self._send_predictions(bandwidth, quality, segments)
                
            except Exception as e:
                logger.error(f"Prediction error: {e}")
            
            time.sleep(1.0)  # Run every second
    
    def _send_predictions(self, bandwidth: float, quality: str, segments: List[int]):
        """Send predictions to other components"""
        # This would call Zig bridge functions
        pass
    
    def update_network_stats(self, bandwidth: float, latency: float, 
                            packet_loss: float, buffer_health: float):
        """Update current network statistics"""
        stats = NetworkStats(
            timestamp=time.time(),
            bandwidth=bandwidth,
            latency=latency,
            packet_loss=packet_loss,
            buffer_health=buffer_health
        )
        
        self.network_predictor.add_stats(stats)
        self.current_bandwidth = bandwidth
        self.current_buffer = buffer_health
    
    def update_playback_position(self, current_time: float):
        """Update current playback position"""
        self.current_time = current_time
    
    def record_viewing_pattern(self, segment_id: int, watch_duration: float):
        """Record viewing pattern for learning"""
        self.video_predictor.viewing_patterns.append((segment_id, watch_duration))
    
    def get_preload_list(self) -> List[int]:
        """Get list of segments to preload"""
        return self.predicted_segments
    
    def save_model(self, path: str):
        """Save trained models"""
        # Save network predictor
        self.network_predictor.model.save(f"{path}/network_model.h5")
        
        # Save video predictor patterns
        with open(f"{path}/viewing_patterns.pkl", 'wb') as f:
            pickle.dump(list(self.video_predictor.viewing_patterns), f)
        
        logger.info(f"Models saved to {path}")
    
    def load_model(self, path: str):
        """Load trained models"""
        # Load network predictor
        model_path = f"{path}/network_model.h5"
        if os.path.exists(model_path):
            self.network_predictor.model = keras.models.load_model(model_path)
        
        # Load viewing patterns
        patterns_path = f"{path}/viewing_patterns.pkl"
        if os.path.exists(patterns_path):
            with open(patterns_path, 'rb') as f:
                patterns = pickle.load(f)
                self.video_predictor.viewing_patterns.extend(patterns)
        
        logger.info(f"Models loaded from {path}")

# Global AI instance
_ai_instance = None

def get_ai() -> VideoAI:
    """Get or create AI instance"""
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = VideoAI()
    return _ai_instance

# C-compatible exports
import ctypes

@ctypes.CFUNCTYPE(None)
def start_ai():
    """Start AI (exported to C)"""
    ai = get_ai()
    ai.start()

@ctypes.CFUNCTYPE(None)
def stop_ai():
    """Stop AI (exported to C)"""
    ai = get_ai()
    ai.stop()

@ctypes.CFUNCTYPE(None, ctypes.c_double, ctypes.c_double, 
                ctypes.c_double, ctypes.c_double)
def update_network_stats(bandwidth, latency, packet_loss, buffer_health):
    """Update network stats (exported to C)"""
    ai = get_ai()
    ai.update_network_stats(bandwidth, latency, packet_loss, buffer_health)

@ctypes.CFUNCTYPE(None, ctypes.c_double)
def update_position(current_time):
    """Update playback position (exported to C)"""
    ai = get_ai()
    ai.update_playback_position(current_time)

@ctypes.CFUNCTYPE(ctypes.POINTER(ctypes.c_int))
def get_preload_segments():
    """Get preload segments (exported to C)"""
    ai = get_ai()
    segments = ai.get_preload_list()
    # Convert to C array
    arr = (ctypes.c_int * len(segments))(*segments)
    return ctypes.cast(arr, ctypes.POINTER(ctypes.c_int))

# Global instance for C interface
ai_instance = None

def init_video_ai():
    """Initialize video AI system"""
    global ai_instance
    ai_instance = VideoAI()
    ai_instance.start()
    logger.info("Video AI initialized")
    return id(ai_instance)

def stop_video_ai(ai_id: int):
    """Stop video AI system"""
    global ai_instance
    if ai_instance:
        ai_instance.stop()
        ai_instance = None
        logger.info("Video AI stopped")

def update_network_stats(ai_id: int, bandwidth: float, latency: float, 
                       packet_loss: float, buffer_health: float):
    """Update network statistics"""
    global ai_instance
    if ai_instance:
        ai_instance.update_network_stats(bandwidth, latency, packet_loss, buffer_health)

def get_predicted_segments(ai_id: int) -> str:
    """Get predicted segments as JSON"""
    global ai_instance
    if ai_instance:
        return json.dumps(ai_instance.predicted_segments)
    return "[]"

def get_current_quality(ai_id: int) -> str:
    """Get current selected quality"""
    global ai_instance
    if ai_instance:
        return ai_instance.quality_optimizer.current_quality
    return "1080p"
