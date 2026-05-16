// Mouse + keyboard input wiring. Canvas click translates to internal coords.

export function attachCanvasClick(canvas, handler) {
  function toInternal(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const w = Number(canvas.dataset.logicalWidth) || canvas.width;
    const h = Number(canvas.dataset.logicalHeight) || canvas.height;
    return { x: Math.floor(px * w), y: Math.floor(py * h) };
  }
  canvas.addEventListener("click", e => {
    handler(toInternal(e));
  });
  canvas.addEventListener("mousemove", e => {
    handler(toInternal(e), { hover: true });
  });
}

export function attachKeyHandler(handler) {
  window.addEventListener("keydown", e => {
    if (e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    handler(e.key);
  });
}
