import React from 'react';

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'shayari_preset';

// Interfaces
export interface ShayariProcessingRequest {
  imageUri: string;
  shayariText: string;
  textStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    position?: 'top' | 'center' | 'bottom';
    backgroundColor?: string;
    opacity?: number;
  };
}

export interface ShayariProcessingResult {
  success: boolean;
  transformedImageUrl?: string;
  originalImageUrl?: string;
  error?: string;
  processingTime?: number;
  metadata?: {
    originalSize: number;
    transformedSize: number;
    textOverlayApplied: boolean;
    cloudinaryPublicId?: string;
  };
}

export interface BridgeHandoffData {
  finalImageUrl: string;
  originalImageUri: string;
  shayariText: string;
  processingMetadata: any;
  cloudinaryPublicId?: string;
}

/**
 * Shayari Processor - Handles image processing with text overlay using Cloudinary
 * This acts as the middle layer between ShayariUpload component and bridge-shayari
 */
class ShayariProcessor {
  private static instance: ShayariProcessor;

  public static getInstance(): ShayariProcessor {
    if (!ShayariProcessor.instance) {
      ShayariProcessor.instance = new ShayariProcessor();
    }
    return ShayariProcessor.instance;
  }

  /**
   * Process shayari image with text overlay using Cloudinary
   * @param request - Processing request with imageUri and shayariText
   * @returns Promise<ShayariProcessingResult> - Processing result
   */
  public async processShayariImage(request: ShayariProcessingRequest): Promise<ShayariProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('ShayariProcessor: Starting image processing...');
      console.log('Input:', { imageUri: request.imageUri, shayariText: request.shayariText });

      // Step 1: Upload original image to Cloudinary
      const originalUploadResult = await this.uploadImageToCloudinary(request.imageUri);
      
      if (!originalUploadResult.success) {
        throw new Error(`Image upload failed: ${originalUploadResult.error}`);
      }

      console.log('ShayariProcessor: Original image uploaded to Cloudinary');

      // Step 2: Apply text overlay transformation
      const transformedUrl = await this.applyTextOverlay(
        originalUploadResult.publicId!,
        request.shayariText,
        request.textStyle
      );

      console.log('ShayariProcessor: Text overlay applied successfully');

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        transformedImageUrl: transformedUrl,
        originalImageUrl: originalUploadResult.secureUrl,
        processingTime,
        metadata: {
          originalSize: originalUploadResult.bytes || 0,
          transformedSize: 0, // Cloudinary doesn't provide transformed size easily
          textOverlayApplied: true,
          cloudinaryPublicId: originalUploadResult.publicId
        }
      };

    } catch (error: any) {
      console.error('ShayariProcessor: Processing failed:', error);
      
      return {
        success: false,
        error: error.message || 'Unknown processing error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Upload image to Cloudinary
   * @param imageUri - Local image URI
   * @returns Promise with upload result
   */
  private async uploadImageToCloudinary(imageUri: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'shayari_image.jpg'
      } as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'shayari-originals');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${result.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        bytes: result.bytes
      };

    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply text overlay transformation using Cloudinary
   * @param publicId - Cloudinary public ID of the image
   * @param shayariText - Text to overlay
   * @param textStyle - Text styling options
   * @returns Transformed image URL
   */
  private async applyTextOverlay(
    publicId: string, 
    shayariText: string, 
    textStyle?: ShayariProcessingRequest['textStyle']
  ): Promise<string> {
    
    const style = {
      fontSize: textStyle?.fontSize || 32,
      fontFamily: textStyle?.fontFamily || 'Arial',
      color: textStyle?.color || 'white',
      position: textStyle?.position || 'bottom',
      backgroundColor: textStyle?.backgroundColor || 'rgba(0,0,0,0.7)',
      opacity: textStyle?.opacity || 0.9,
      ...textStyle
    };

    // Cloudinary transformation parameters
    const textParams = this.buildTextTransformation(shayariText, style);
    
    const transformedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${textParams}/${publicId}`;
    
    console.log('ShayariProcessor: Generated transformed URL:', transformedUrl);
    
    return transformedUrl;
  }

  /**
   * Build Cloudinary text transformation parameters
   * @param text - Text to overlay
   * @param style - Text styling
   * @returns Transformation string
   */
  private buildTextTransformation(text: string, style: any): string {
    // URL encode the text
    const encodedText = encodeURIComponent(text);
    
    // Build text overlay transformation
    const textOverlay = `l_text:${style.fontName || 'Arial'}_${style.fontSize}_bold:${encodedText},co_${style.color.replace('#', '')},g_${style.position}`;
    
    // Add background if specified
    const backgroundOverlay = style.backgroundColor ? 
      `l_${this.getColorName(style.backgroundColor)},w_1.0,h_0.3,fl_relative,g_${style.position}` : '';
    
    // Combine transformations
    const transformations = [
      'c_fill,h_1080,w_1080', // Ensure consistent dimensions
      backgroundOverlay,
      textOverlay
    ].filter(Boolean).join('/');

    return transformations;
  }

  /**
   * Convert color hex to Cloudinary color name
   * @param color - Color string
   * @returns Cloudinary color name
   */
  private getColorName(color: string): string {
    const colorMap: { [key: string]: string } = {
      'rgba(0,0,0,0.7)': 'black',
      'rgba(255,255,255,0.9)': 'white',
      'rgba(255,0,0,0.7)': 'red',
      'rgba(0,255,0,0.7)': 'green',
      'rgba(0,0,255,0.7)': 'blue',
      'rgba(255,255,0,0.7)': 'yellow',
      'rgba(255,0,255,0.7)': 'magenta',
      'rgba(0,255,255,0.7)': 'cyan'
    };

    return colorMap[color] || 'black';
  }

  /**
   * Handoff processed data to bridge-shayari
   * @param processingResult - Result from image processing
   * @param originalRequest - Original processing request
   * @returns Bridge handoff data
   */
  public prepareBridgeHandoff(
    processingResult: ShayariProcessingResult,
    originalRequest: ShayariProcessingRequest
  ): BridgeHandoffData {
    
    if (!processingResult.success || !processingResult.transformedImageUrl) {
      throw new Error('Cannot prepare bridge handoff: Processing failed');
    }

    return {
      finalImageUrl: processingResult.transformedImageUrl,
      originalImageUri: originalRequest.imageUri,
      shayariText: originalRequest.shayariText,
      processingMetadata: processingResult.metadata,
      cloudinaryPublicId: processingResult.metadata?.cloudinaryPublicId
    };
  }

  /**
   * Complete workflow: Process image and prepare for bridge
   * @param request - Processing request
   * @returns Bridge handoff data ready for bridge-shayari
   */
  public async processAndPrepareForBridge(request: ShayariProcessingRequest): Promise<BridgeHandoffData> {
    console.log('ShayariProcessor: Starting complete workflow...');
    
    // Step 1: Process the image
    const processingResult = await this.processShayariImage(request);
    
    if (!processingResult.success) {
      throw new Error(`Processing failed: ${processingResult.error}`);
    }

    // Step 2: Prepare for bridge handoff
    const bridgeData = this.prepareBridgeHandoff(processingResult, request);
    
    console.log('ShayariProcessor: Workflow completed successfully');
    console.log('Bridge handoff data:', bridgeData);
    
    return bridgeData;
  }
}

// Export singleton instance
export const shayariProcessor = ShayariProcessor.getInstance();

// Export utility functions for direct usage
export const processShayariImage = (request: ShayariProcessingRequest) => 
  shayariProcessor.processShayariImage(request);

export const processAndPrepareForBridge = (request: ShayariProcessingRequest) => 
  shayariProcessor.processAndPrepareForBridge(request);

export default shayariProcessor;
