// Set the sizing mode before styles load; native action popups measure the root to choose their viewport.
if (globalThis.chrome?.runtime?.id) {
  document.documentElement.classList.add('extension-popup');
  const fitHeight = () => {
    // Ignore the provisional viewport until the browser has measured the requested popup size.
    if (innerHeight >= 300) {
      document.documentElement.style.setProperty('--popup-height', `${Math.min(590, innerHeight)}px`);
    }
  };
  addEventListener('resize', fitHeight);
  addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => requestAnimationFrame(fitHeight)));
}
