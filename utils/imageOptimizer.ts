import imageCompression from 'browser-image-compression';

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
