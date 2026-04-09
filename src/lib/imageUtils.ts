/**
 * Converts any image File to WebP format using an offscreen Canvas.
 * Falls back to the original file if conversion fails or if the browser
 * doesn't support the WebP encoder.
 *
 * @param file    - Original image File (jpeg, png, gif, webp, etc.)
 * @param quality - WebP quality 0–1 (default 0.85)
 * @param maxPx   - Max dimension in pixels; image is scaled down if larger (default 1920)
 */
export async function toWebP(
  file: File,
  quality = 0.85,
  maxPx = 1920
): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // not an image, pass through

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Scale down if needed
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + ".webp",
            { type: "image/webp", lastModified: Date.now() }
          );
          resolve(webpFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original
    };

    img.src = objectUrl;
  });
}

/**
 * Converts a File to a base64 data string (without the data: prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Returns a human-readable file size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
