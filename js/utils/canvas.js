const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * Resizes a canvas without accumulating context transforms.
 * Logical game coordinates always remain in CSS pixels.
 */
export function configureCanvas(canvas, context, width, height) {
  const logicalWidth = Math.max(1, Math.round(width));
  const logicalHeight = Math.max(1, Math.round(height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
  const pixelWidth = Math.round(logicalWidth * pixelRatio);
  const pixelHeight = Math.round(logicalHeight * pixelRatio);

  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { width: logicalWidth, height: logicalHeight, pixelRatio };
}
