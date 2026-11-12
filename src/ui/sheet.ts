/**
 * The sound-controls panel. On roomy screens it is laid out inline (sidebar
 * or cards) and this module does nothing. On compact screens CSS turns it
 * into a bottom sheet (or a side sheet in short landscape) opened from the
 * dock's SOUND button; this module handles open/close, Escape, the backdrop,
 * swipe-down to dismiss, and keeping focus out of it while it is closed.
 */

const COMPACT = "(max-width: 699px), (max-height: 520px)";

export function mountSheet(): void {
  const sheet = document.getElementById("controls");
  const openBtn = document.getElementById("soundBtn");
  const closeBtn = document.getElementById("sheetClose");
  const backdrop = document.getElementById("sheetBackdrop");
  const grip = document.getElementById("sheetGrip");
  if (!sheet || !openBtn) return;

  const mq = matchMedia(COMPACT);
  let open = false;

  const sync = () => {
    const compact = mq.matches;
    sheet.classList.toggle("open", compact && open);
    backdrop?.classList.toggle("show", compact && open);
    sheet.toggleAttribute("inert", compact && !open);
    if (compact) {
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
    } else {
      sheet.removeAttribute("role");
      sheet.removeAttribute("aria-modal");
    }
    openBtn.setAttribute("aria-expanded", compact && open ? "true" : "false");
  };

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    sync();
    if (open) closeBtn?.focus({ preventScroll: true });
    else if (mq.matches) openBtn.focus({ preventScroll: true });
  };

  openBtn.addEventListener("click", () => setOpen(!open));
  closeBtn?.addEventListener("click", () => setOpen(false));
  backdrop?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });
  mq.addEventListener("change", sync);

  // Swipe the grip/header down (or right, for the side sheet) to dismiss
  if (grip) {
    let start: { x: number; y: number; id: number } | null = null;
    grip.addEventListener("pointerdown", (e) => {
      if (e.target instanceof Element && e.target.closest("button")) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dy = Math.max(0, e.clientY - start.y);
      const dx = Math.max(0, e.clientX - start.x);
      sheet.style.setProperty("--drag", `${Math.max(dy, dx)}px`);
    });
    const end = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dist = Math.max(e.clientY - start.y, e.clientX - start.x);
      start = null;
      sheet.style.removeProperty("--drag");
      if (dist > 60) setOpen(false);
    };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }

  sync();
}
