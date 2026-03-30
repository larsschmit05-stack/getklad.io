// ---------------------------------------------------------------------------
// Pixel-level image cropping via offscreen canvas
// ---------------------------------------------------------------------------

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropResult = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Crop an image to the specified region.
 *
 * The cropBox is in node-space coordinates (0,0 = top-left of node).
 * This function accounts for how the image is rendered inside the node
 * (contain/cover fit mode with centering) and extracts the corresponding
 * pixel region from the source image.
 */
export function cropImagePixels(
  src: string,
  cropBox: CropBox,
  nodeW: number,
  nodeH: number,
  fit: "contain" | "cover" = "contain",
  mimeType?: string,
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Compute how the image is rendered within the node (replicating SVG preserveAspectRatio xMidYMid meet/slice)
      const scale =
        fit === "cover"
          ? Math.max(nodeW / imgW, nodeH / imgH)
          : Math.min(nodeW / imgW, nodeH / imgH);

      const renderedW = imgW * scale;
      const renderedH = imgH * scale;
      const offsetX = (nodeW - renderedW) / 2;
      const offsetY = (nodeH - renderedH) / 2;

      // Map crop box from node-space to source image pixel coords
      let srcX = (cropBox.x - offsetX) / scale;
      let srcY = (cropBox.y - offsetY) / scale;
      let srcW = cropBox.width / scale;
      let srcH = cropBox.height / scale;

      // Clamp to image bounds
      if (srcX < 0) {
        srcW += srcX;
        srcX = 0;
      }
      if (srcY < 0) {
        srcH += srcY;
        srcY = 0;
      }
      srcW = Math.min(srcW, imgW - srcX);
      srcH = Math.min(srcH, imgH - srcY);

      // Ensure minimum dimensions
      srcW = Math.max(1, Math.round(srcW));
      srcH = Math.max(1, Math.round(srcH));
      srcX = Math.round(srcX);
      srcY = Math.round(srcY);

      const canvas = document.createElement("canvas");
      canvas.width = srcW;
      canvas.height = srcH;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas 2d context"));
        return;
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      // Preserve original format when possible
      const outputType = mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
      const quality = outputType === "image/jpeg" ? 0.92 : undefined;
      const dataUrl = canvas.toDataURL(outputType, quality);

      resolve({ dataUrl, width: srcW, height: srcH });
    };

    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = src;
  });
}
