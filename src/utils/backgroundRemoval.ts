import { removeBackground, Config } from '@imgly/background-removal';

export interface BackgroundRemovalResult {
    imageUrl: string;
    blob: Blob;
}

export interface BackgroundRemovalOptions {
    quality?: 'low' | 'medium' | 'high';
    outputFormat?: 'image/png' | 'image/webp';
}

/**
 * Remove background from an image using @imgly/background-removal
 * This runs entirely in the browser using WebAssembly with optimized settings
 */
export async function removeImageBackground(
    imageUrl: string,
    onProgress?: (progress: number) => void,
    options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
    try {
        const { quality = 'high', outputFormat = 'image/png' } = options;

        // Fetch the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Create an image element to get dimensions
        const img = new Image();
        const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
        img.src = URL.createObjectURL(blob);
        await imageLoadPromise;

        // Configure background removal with high-quality settings
        const config: Config = {
            progress: (key, current, total) => {
                const progress = Math.round((current / total) * 100);
                onProgress?.(progress);
            },
            model: 'medium', // Use medium model for best quality/speed balance
            output: {
                format: outputFormat,
                quality: quality === 'high' ? 1.0 : quality === 'medium' ? 0.8 : 0.6,
                type: 'foreground', // Extract only the foreground
            },
        };

        // Remove background with optimized settings
        const resultBlob = await removeBackground(blob, config);

        // Create object URL for the result
        const resultUrl = URL.createObjectURL(resultBlob);

        // Clean up the temporary object URL
        URL.revokeObjectURL(img.src);

        return {
            imageUrl: resultUrl,
            blob: resultBlob,
        };
    } catch (error) {
        console.error('Background removal error:', error);
        throw new Error('Failed to remove background: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

/**
 * Compose an image with a new background using high-quality canvas rendering
 */
export async function composeWithBackground(
    foregroundUrl: string,
    backgroundUrl: string,
    options: {
        foregroundScale?: number;
        foregroundPosition?: { x: number; y: number };
        outputQuality?: number;
    } = {}
): Promise<string> {
    return new Promise((resolve, reject) => {
        const {
            foregroundScale = 1,
            foregroundPosition,
            outputQuality = 1.0,
        } = options;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
            alpha: true,
            willReadFrequently: false,
        });

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        const background = new Image();
        const foreground = new Image();

        background.crossOrigin = 'anonymous';
        foreground.crossOrigin = 'anonymous';

        let backgroundLoaded = false;
        let foregroundLoaded = false;

        const tryCompose = () => {
            if (!backgroundLoaded || !foregroundLoaded) return;

            // Set canvas size to background size for best quality
            canvas.width = background.width;
            canvas.height = background.height;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw background
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Calculate foreground scaling and positioning
            const scale = foregroundScale * Math.min(
                canvas.width / foreground.width,
                canvas.height / foreground.height
            );

            const scaledWidth = foreground.width * scale;
            const scaledHeight = foreground.height * scale;

            // Use custom position or center by default
            const x = foregroundPosition?.x ?? (canvas.width - scaledWidth) / 2;
            const y = foregroundPosition?.y ?? (canvas.height - scaledHeight) / 2;

            // Draw foreground with high quality
            ctx.drawImage(foreground, x, y, scaledWidth, scaledHeight);

            // Convert to data URL with high quality
            const dataUrl = canvas.toDataURL('image/png', outputQuality);
            resolve(dataUrl);
        };

        background.onload = () => {
            backgroundLoaded = true;
            tryCompose();
        };

        foreground.onload = () => {
            foregroundLoaded = true;
            tryCompose();
        };

        background.onerror = () => reject(new Error('Failed to load background image'));
        foreground.onerror = () => reject(new Error('Failed to load foreground image'));

        background.src = backgroundUrl;
        foreground.src = foregroundUrl;
    });
}
