/**
 * Drawer mounting: open/close + tab switching for the controls drawer.
 * Behaviour is identical on desktop and mobile at this stage; the
 * bottom-sheet sliding behaviour for narrow viewports is added later.
 */

type TabId = "mix" | "auto" | "patterns";

export function mountDrawer(): void {
  const handle = document.getElementById("drawerHandle");
  const drawer = document.getElementById("drawer");
  const closeBtn = document.getElementById("drawerClose");
  if (!handle || !drawer) return;

  handle.addEventListener("click", () => toggleDrawer(drawer, handle));
  closeBtn?.addEventListener("click", () => setDrawerOpen(drawer, handle, false));

  document.querySelectorAll<HTMLElement>(".drawer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab as TabId | undefined;
      if (id) selectTab(id);
    });
  });
  attachSheetSwipe(drawer, handle);
}

function toggleDrawer(drawer: HTMLElement, handle: HTMLElement): void {
  setDrawerOpen(drawer, handle, !drawer.classList.contains("open"));
}

function setDrawerOpen(drawer: HTMLElement, handle: HTMLElement, open: boolean): void {
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  handle.setAttribute("aria-expanded", open ? "true" : "false");
}

function attachSheetSwipe(drawer: HTMLElement, handle: HTMLElement): void {
  const tabs = drawer.querySelector<HTMLElement>(".drawer-tabs");
  if (!tabs) return;

  let startY: number | null = null;

  tabs.addEventListener("touchstart", (ev) => {
    if (!drawer.classList.contains("open")) return;
    if (!matchMedia("(max-width: 720px)").matches) return;
    const t = ev.touches[0];
    if (t) startY = t.clientY;
  }, { passive: true });

  tabs.addEventListener("touchmove", (ev) => {
    if (startY === null) return;
    const t = ev.touches[0];
    if (!t) return;
    const dy = t.clientY - startY;
    if (dy > 60) {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      handle.setAttribute("aria-expanded", "false");
      startY = null;
    }
  }, { passive: true });

  tabs.addEventListener("touchend", () => {
    startY = null;
  }, { passive: true });
}

function selectTab(id: TabId): void {
  document.querySelectorAll<HTMLElement>(".drawer-tab").forEach((t) => {
    const match = t.dataset.tab === id;
    t.classList.toggle("active", match);
    t.setAttribute("aria-selected", match ? "true" : "false");
  });
  document.querySelectorAll<HTMLElement>(".drawer-pane").forEach((p) => {
    p.classList.toggle("active", p.dataset.pane === id);
  });
}
