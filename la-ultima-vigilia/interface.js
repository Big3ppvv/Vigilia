/* Las capas comparten aislamiento, teclado y restauración del foco. */
const MODALS = {paused: 'pause', levelup: 'levelup', crate: 'crate', shop: 'shop', ended: 'end'};

export function syncScreens(state) {
  const modalId = MODALS[state];
  for (const id of ['game', 'title', 'hud']) document.getElementById(id).inert = !!modalId;
  document.querySelector('.corner-tools').inert = !!modalId && modalId !== 'shop';
  for (const id of Object.values(MODALS)) {
    const el = document.getElementById(id);
    el.inert = id !== modalId;
    if (id === modalId) el.setAttribute('aria-modal', 'true');
    else el.removeAttribute('aria-modal');
  }
}

export function bindOverlayKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || document.querySelector('dialog[open]')) return;
    const panel = document.querySelector('.overlay[aria-modal="true"]');
    if (!panel) return;
    const controls = [...panel.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')]
      .filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      e.preventDefault(); last?.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      e.preventDefault(); first?.focus();
    }
  });
}
