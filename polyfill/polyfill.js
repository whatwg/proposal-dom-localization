import { Localization } from "./localization.js";

class MsgOpts extends Map {
  /** @type {HTMLElement} */
  #el;

  /** @param {HTMLElement} element */
  constructor(element) {
    super();
    this.#el = element;
  }

  set(key, value, update = true) {
    super.set(key, value);
    if (update) this.#el.ownerDocument.l10n.update([this.#el]);
  }
}

Object.defineProperties(HTMLElement.prototype, {
  msg: {
    /** @this {HTMLElement} */
    get() {
      return this.getAttribute("msg");
    },
    /** @this {HTMLElement} */
    set(msg) {
      if (Array.isArray(msg)) {
        this.msgOpts.clear();
        for (const [name, value] of Object.entries(msg[1] ?? {})) {
          this.msgOpts.set(name, value, false);
        }
        msg = msg[0];
      }
      if (msg) this.setAttribute("msg", msg);
      else this.removeAttribute("msg");
    },
  },

  msgOpts: {
    /** @this {HTMLElement} */
    get() {
      if (!this._msgOpts) {
        this._msgOpts = new MsgOpts(this);
        for (const attr of this.attributes) {
          if (attr.name.startsWith("msg-")) {
            const optName = attr.name.substring(4);
            this._msgOpts.set(optName, attr.value, false);
          }
        }
      }
      return this._msgOpts;
    },
  },
});

document.l10n = new Localization(document);
await document.l10n.init();
