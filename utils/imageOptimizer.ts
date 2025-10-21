import imageCompression from 'browser-image-compression';
import { OutputQuality } from '../types';

/**
 * Compresses an image file in the browser before upload.
 * @param file The image file to compress.
 * @returns A promise that resolves to the compressed image file.
 */
export const optimizeImage = async (file: File): Promise<File> => {
    // Sensible defaults for web usage
    const options = {
        maxSizeMB: 1,          // Max file size in megabytes
        maxWidthOrHeight: 1920, // Max width or height in pixels
        useWebWorker: true,    // Use web workers for better performance
        initialQuality: 0.8    // Start with 80% quality
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error("Image compression failed:", error);
        // If compression fails for any reason, return the original file to avoid breaking the user flow
        return file;
    }
};

/**
 * Helper to convert a data URL to a File object.
 * @param dataUrl The data URL string.
 * @param filename The desired filename for the resulting file.
 * @returns A promise that resolves to a File object.
 */
async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}

/**
 * Compresses an image from a data URL for download based on a quality setting.
 * @param dataUrl The data URL of the image to compress.
 * @param mimeType The MIME type of the original image.
 * @param quality The desired quality level ('low', 'medium', 'high').
 * @returns A promise that resolves to the compressed image as a data URL.
 */
export const compressImageForDownload = async (dataUrl: string, mimeType: string, quality: OutputQuality): Promise<string> => {
    const qualityOptions = {
        low: { maxSizeMB: 0.5, initialQuality: 0.6 },
        medium: { maxSizeMB: 1, initialQuality: 0.8 },
        high: { maxSizeMB: 5, initialQuality: 0.95 }
    };

    const options = {
        ...qualityOptions[quality],
        useWebWorker: true,
        // We don't set maxWidthOrHeight here to preserve the original dimensions from the AI
    };
    
    const file = await dataURLtoFile(dataUrl, `source.${mimeType.split('/')[1] || 'png'}`);

    try {
        const compressedFile = await imageCompression(file, options);
        // Convert compressed file back to data URL
        const compressedDataUrl = await imageCompression.getDataUrlFromFile(compressedFile);
        return compressedDataUrl;
    } catch (error) {
        console.error("Image compression for download failed:", error);
        // If compression fails, return the original data URL
        return dataUrl;
    }
};

/**
 * Applies brightness and contrast filters to an image data URL via a canvas.
 * @param dataUrl The source image data URL.
 * @param brightness The brightness percentage (100 is no change).
 * @param contrast The contrast percentage (100 is no change).
 * @returns A promise that resolves to the new data URL with filters applied.
 */
export const applyVisualAdjustments = (
    dataUrl: string,
    brightness: number,
    contrast: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If no adjustments are needed, return the original URL
        if (brightness === 100 && contrast === 100) {
            resolve(dataUrl);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
            ctx.drawImage(img, 0, 0);

            // Extract mimeType from original dataUrl
            const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
            resolve(canvas.toDataURL(mimeType));
        };
        img.onerror = (err) => {
            reject(new Error(`Failed to load image for adjustments: ${err}`));
        };
        img.src = dataUrl;
    });
};