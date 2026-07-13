/**
 * Export panel controller (progress UI, download link).
 * Rendering/interaction logic lands in ETAP 2 (UI) and ETAP 4 (real export).
 */
export class ExportView {
  /** @param {HTMLElement} rootElement */
  constructor(rootElement) {
    this.rootElement = rootElement;
  }

  // TODO(ETAP-2/4): render export controls bound to ExportEngine
}
