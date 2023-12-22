/**
 * Returns a {@link Promise} which resolves after the next frame is rendered,
 * meaning at least one macrotask after all active {@link requestAnimationFrame}
 * callbacks have been invoked.
 */
export async function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      // Current in an animation frame, but other RAF calls may still be
      // pending if they were initially scheduled after this one. Therefore we
      // wait one additional macrotask to make sure all RAF calls in this batch
      // have executed. We can't use `queueMicrotask` here because RAF appears
      // to flush all pending microtasks between callbacks. Instead we use
      // `setTimeout` to create a macrotask.
      setTimeout(() => {
        resolve();
      });

      // If Jasmine's mock clock is enabled, we'll need to manually tick to
      // trigger the above `setTimeout`.
      if (globalThis.jasmine) {
        try {
          globalThis.jasmine.clock().tick(0);
        } catch { /* Clock may not be installed. */ }
      }
    });
  });
}
