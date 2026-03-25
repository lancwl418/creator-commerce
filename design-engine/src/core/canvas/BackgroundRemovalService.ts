/**
 * Browser-side background removal using @imgly/background-removal.
 * Runs ML inference entirely in the browser (no server required).
 */
export class BackgroundRemovalService {
  private static processing = false;

  static isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Remove the background from an image.
   * @param imageSrc — data URL or object URL of the image
   * @returns A data URL of the image with background removed (PNG with transparency)
   */
  static async removeBackground(
    imageSrc: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (this.processing) throw new Error('Already processing');

    this.processing = true;
    try {
      // Dynamic import to avoid loading the large ML model until needed
      const { removeBackground } = await import('@imgly/background-removal');

      // Convert data URL to blob if needed
      let input: string | Blob = imageSrc;
      if (imageSrc.startsWith('data:')) {
        const res = await fetch(imageSrc);
        input = await res.blob();
      }

      const resultBlob = await removeBackground(input, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            onProgress?.(current / total);
          }
        },
      });

      // Convert result blob to data URL
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
    } finally {
      this.processing = false;
    }
  }
}
