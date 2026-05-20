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
}

function toggleDrawer(drawer: HTMLElement, handle: HTMLElement): void {
  setDrawerOpen(drawer, handle, !drawer.classList.contains("open"));
}

function setDrawerOpen(drawer: HTMLElement, handle: HTMLElement, open: boolean): void {
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  handle.setAttribute("aria-expanded", open ? "true" : "false");
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
