/** Wait for the page's resources, then give initial rendering a quiet second. */
export function afterPageLoad(callback: () => void, browser: Window = window): () => void {
  let timer: number | undefined;
  let idle: number | undefined;

  const schedule = () => {
    timer = browser.setTimeout(() => {
      if (typeof browser.requestIdleCallback === "function") {
        idle = browser.requestIdleCallback(callback, { timeout: 2000 });
      } else {
        callback();
      }
    }, 1000);
  };

  if (browser.document.readyState === "complete") schedule();
  else browser.addEventListener("load", schedule, { once: true });

  return () => {
    browser.removeEventListener("load", schedule);
    if (timer !== undefined) browser.clearTimeout(timer);
    if (idle !== undefined) browser.cancelIdleCallback(idle);
  };
}
