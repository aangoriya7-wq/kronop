import { Platform } from 'react-native';

// Environment Configuration
interface EnvConfig {
  BUNNY_API_KEY: string;
  BUNNY_STORAGE_ZONE: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_UPLOAD_PRESET: string;
  API_BASE_URL: string;
}

// Upload Types
export enum UploadType {
  VIDEO = 'video',
  PHOTO = 'photo',
  SHAYARI = 'shayari',
  REEL = 'reel',
  STORY = 'story',
  LIVE = 'live'
}

export enum UploadStrategy {
  DIRECT = 'direct',
  CHUNKED = 'chunked',
  PROCESSED = 'processed'
}

// Upload Progress Interface
export interface UploadProgress {
  percentage: number;
  status?: string;
  error?: string;
  currentStep?: string;
}

// Upload Result Interface
export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  uploadId?: string;
  error?: string;
  metadata?: any;
  processingTime?: number;
}

// Upload Request Interface
export interface UploadRequest {
  type: UploadType;
  fileUri: string;
  metadata?: any;
  onProgress?: (progress: UploadProgress) => void;
  strategy?: UploadStrategy;
}

// Upload Listener Interface
export interface UploadListener {
  onStart?: (uploadId: string) => void;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

// Universal Upload Manager Class
class UploadAPIManager {
  private static instance: UploadAPIManager;
  private envConfig: EnvConfig;
  private activeUploads: Map<string, UploadListener> = new Map();
  private uploadQueue: UploadRequest[] = [];
  private isProcessing = false;

  private constructor() {
    this.envConfig = {
      BUNNY_API_KEY: process.env.EXPO_PUBLIC_BUNNY_API_KEY || '',
      BUNNY_STORAGE_ZONE: process.env.EXPO_PUBLIC_BUNNY_STORAGE_ZONE || 'kronop',
      CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
      CLOUDINARY_API_KEY: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || '',
      CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'shayari_preset',
      API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kronop-9gju.onrender.com'
    };
  }

  public static getInstance(): UploadAPIManager {
    if (!UploadAPIManager.instance) {
      UploadAPIManager.instance = new UploadAPIManager();
    }
    return UploadAPIManager.instance;
  }

  // Universal Upload Function
  public async universalUpload(request: UploadRequest): Promise<UploadResult> {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`UploadManager: Starting ${request.type} upload with strategy: ${request.strategy || 'auto'}`);
      
      // Auto-detect strategy if not provided
      const strategy = request.strategy || this.detectStrategy(request.type);
      
      // Add listener for progress tracking
      this.activeUploads.set(uploadId, {
        onStart: () => {
          if (request.onProgress) {
            request.onProgress({ percentage: 0, status: 'Initializing upload...', currentStep: 'start' });
          }
        },
        onProgress: (progress) => {
          if (request.onProgress) {
            request.onProgress({ ...progress, currentStep: 'uploading' });
          }
        },
        onComplete: (result) => {
          this.activeUploads.delete(uploadId);
          if (request.onProgress) {
            request.onProgress({ percentage: 100, status: 'Upload completed!', currentStep: 'complete' });
          }
        },
        onError: (error) => {
          this.activeUploads.delete(uploadId);
          if (request.onProgress) {
            request.onProgress({ percentage: 0, status: `Upload failed: ${error}`, currentStep: 'error', error });
          }
        }
      });

      // Trigger start
      const listener = this.activeUploads.get(uploadId);
      if (listener?.onStart) {
        listener.onStart(uploadId);
      }

      // Execute upload based on strategy
      let result: UploadResult;
      
      switch (strategy) {
        case UploadStrategy.PROCESSED:
          result = await this.processedUpload(request, uploadId);
          break;
        case UploadStrategy.CHUNKED:
          result = await this.chunkedUpload(request, uploadId);
          break;
        case UploadStrategy.DIRECT:
        default:
          result = await this.directUpload(request, uploadId);
          break;
      }

      // Trigger completion
      if (listener?.onComplete) {
        listener.onComplete(result);
      }

      return result;

    } catch (error: any) {
      console.error(`UploadManager: Upload failed for ${request.type}:`, error);
      
      const listener = this.activeUploads.get(uploadId);
      if (listener?.onError) {
        listener.onError(error.message || 'Unknown error');
      }

      return {
        success: false,
        error: error.message || 'Upload failed',
        uploadId
      };
    }
  }

  // Auto-detect upload strategy based on file type
  private detectStrategy(type: UploadType): UploadStrategy {
    switch (type) {
      case UploadType.SHAYARI:
        return UploadStrategy.PROCESSED; // Use Cloudinary processing
      case UploadType.VIDEO:
      case UploadType.REEL:
        return UploadStrategy.CHUNKED; // Use chunked upload for large files
      case UploadType.PHOTO:
      case UploadType.STORY:
      default:
        return UploadStrategy.DIRECT; // Use direct upload for small files
    }
  }

  // Processed Upload (for Shayari)
  private async processedUpload(request: UploadRequest, uploadId: string): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      console.log('UploadManager: Starting processed upload for shayari');
      
      // This will be handled by shayari-processor -> bridge flow
      // For now, return a placeholder result
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        uploadId,
        url: 'processed_upload_url',
        fileName: `processed_${uploadId}`,
        processingTime,
        metadata: {
          strategy: UploadStrategy.PROCESSED,
          type: request.type,
          processed: true
        }
      };
      
    } catch (error: any) {
      throw new Error(`Processed upload failed: ${error.message}`);
    }
  }

  // Chunked Upload (for Videos/Reels)
  private async chunkedUpload(request: UploadRequest, uploadId: string): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      console.log('UploadManager: Starting chunked upload');
      
      // This will be implemented by bridges
      // For now, return a placeholder result
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        uploadId,
        url: 'chunked_upload_url',
        fileName: `chunked_${uploadId}`,
        processingTime,
        metadata: {
          strategy: UploadStrategy.CHUNKED,
          type: request.type,
          chunked: true
        }
      };
      
    } catch (error: any) {
      throw new Error(`Chunked upload failed: ${error.message}`);
    }
  }

  // Direct Upload (for Photos/Stories)
  private async directUpload(request: UploadRequest, uploadId: string): Promise<UploadResult> {
    const startTime = Date.now();
    
    try {
      console.log('UploadManager: Starting direct upload');
      
      const BUNNY_API_KEY = this.envConfig.BUNNY_API_KEY;
      const BUNNY_STORAGE_ZONE = this.envConfig.BUNNY_STORAGE_ZONE;
      
      // Generate storage path based on type
      const storagePath = this.getStoragePath(request.type);
      const fileExtension = request.fileUri.split('.').pop() || 'jpg';
      const fileName = `${storagePath}/${request.type}_${uploadId}.${fileExtension}`;
      const bunnyUrl = `https://storage.bunnycdn.net/${BUNNY_STORAGE_ZONE}/${fileName}`;
      
      // Fetch file and upload to BunnyCDN
      const response = await fetch(request.fileUri);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(bunnyUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': blob.type || 'application/octet-stream',
          'Content-Length': blob.size.toString()
        },
        body: blob
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`BunnyCDN upload failed: ${uploadResponse.status}`);
      }
      
      const processingTime = Date.now() - startTime;
      const cdnUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${fileName}`;
      
      return {
        success: true,
        uploadId,
        url: cdnUrl,
        fileName,
        processingTime,
        metadata: {
          strategy: UploadStrategy.DIRECT,
          type: request.type,
          size: blob.size,
          storagePath
        }
      };
      
    } catch (error: any) {
      throw new Error(`Direct upload failed: ${error.message}`);
    }
  }

  // Get storage path based on upload type
  private getStoragePath(type: UploadType): string {
    switch (type) {
      case UploadType.VIDEO:
        return 'uploads/videos';
      case UploadType.REEL:
        return 'uploads/reels';
      case UploadType.PHOTO:
        return 'uploads/photos';
      case UploadType.SHAYARI:
        return 'uploads/shayari';
      case UploadType.STORY:
        return 'uploads/stories';
      default:
        return 'uploads/others';
    }
  }

  // Queue Management
  public addToQueue(request: UploadRequest): void {
    this.uploadQueue.push(request);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.uploadQueue.length > 0) {
      const request = this.uploadQueue.shift();
      if (request) {
        await this.universalUpload(request);
      }
    }
    
    this.isProcessing = false;
  }

  // Get Environment Config (for debugging)
  public getEnvConfig(): EnvConfig {
    return { ...this.envConfig };
  }

  // Cancel Upload
  public cancelUpload(uploadId: string): boolean {
    const listener = this.activeUploads.get(uploadId);
    if (listener) {
      this.activeUploads.delete(uploadId);
      if (listener.onError) {
        listener.onError('Upload cancelled');
      }
      return true;
    }
    return false;
  }

  // Get Active Uploads
  public getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }
}

// Export Singleton Instance
export const uploadAPIManager = UploadAPIManager.getInstance();

// Default Export
export default UploadAPIManager;
