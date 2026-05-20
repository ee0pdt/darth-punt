// Register the service worker for offline support. No-op if running over a
// non-http(s) origin (e.g. opened via file://).
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  globalThis.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("sw registration failed", err);
    });
  });
}
