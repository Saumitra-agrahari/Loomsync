export const MAX_PHOTO_SIZE_BYTES = 300 * 1024; // 300 KB

export type ValidatedImage = {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
};

export function validateImageBuffer(buffer: Buffer): { success: true; image: ValidatedImage } | { success: false; error: string } {
  if (buffer.length === 0) {
    return { success: false, error: "Image data is empty" };
  }

  if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
    return {
      success: false,
      error: `Image size (${Math.round(buffer.length / 1024)} KB) exceeds the maximum allowed size of 300 KB.`,
    };
  }

  // Detect MIME type via magic bytes
  let detectedMime: "image/jpeg" | "image/png" | "image/webp" | null = null;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = "image/jpeg";
  }
  // PNG: 89 50 4E 47
  else if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    detectedMime = "image/png";
  }
  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detectedMime = "image/webp";
  }

  if (!detectedMime) {
    return {
      success: false,
      error: "Invalid image format. Only JPEG, PNG, and WebP images are allowed.",
    };
  }

  return {
    success: true,
    image: {
      buffer,
      mimeType: detectedMime,
      sizeBytes: buffer.length,
    },
  };
}

export function parseBase64Image(dataStr: string): Buffer | null {
  try {
    const base64Data = dataStr.includes(",") ? dataStr.split(",")[1] : dataStr;
    return Buffer.from(base64Data, "base64");
  } catch {
    return null;
  }
}
