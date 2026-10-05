const msgObserverOptions = { attributes: true, childList: true, subtree: true };

export class Localization {
  /** @type {Document} */
  #doc;

  /** @type {Map<string, string[]>} */
  #langMap = new Map();
  /** @type {Map<string, HTMLLinkElement[]>} */
  #linkMap = new Map();
  /** @type {Map<string, any>} */
  #resources = new Map();

  #langObserver = new MutationObserver(langCallback);
  #linkObserver = new MutationObserver(linkCallback);
  #msgObserver = new MutationObserver(msgCallback);

  constructor(doc) {
    this.#doc = doc;
  }

  async init() {
    await this.loadResources();
    this.#langObserver.observe(this.#doc, {
      attributes: true,
      attributeFilter: ["lang"],
      subtree: true,
    });
    this.#linkObserver.observe(this.#doc.head, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    this.update();
  }

  async loadResources() {
    this.#linkMap.clear();
    for (const link of this.#doc.head.querySelectorAll("link[rel=messages]")) {
      const lang = link.hreflang.toLowerCase();
      this.#linkMap.getOrInsert(lang, []).unshift(link);
    }

    this.#langMap.clear();
    for (const el of this.#doc.querySelectorAll("[lang]")) {
      this.#langMap.getOrInsert(el.lang.toLowerCase(), []);
    }
    for (let [lang, hreflangs] of this.#langMap.entries()) {
      // TODO: Do proper locale negotiation
      while (true) {
        if (this.#linkMap.has(lang)) hreflangs.push(lang);
        if (!lang) break;
        lang = lang.replace(/-?[^-]*$/, "");
      }
    }
    if (!this.#langMap.size && this.#linkMap.has("")) {
      this.#langMap.set("", [""]);
    }

    await this.#loadLinks(
      new Set(Array.from(this.#langMap.values(), (hreflangs) => hreflangs[0])),
    );
  }

  /** @param {Set<string>} langs  */
  #loadLinks(langs) {
    return Promise.allSettled(
      Array.from(this.#doc.head.querySelectorAll("link[rel=messages]"))
        .filter((link) => langs.has(link.hreflang.toLowerCase()))
        .map(async (link) => {
          if (this.#resources.has(link.href)) return;
          try {
            // FIXME: Should also handle crossorigin, integrity, and referrerpolicy
            const res = await fetch(link.href);
            if (!res.ok) throw new Error(res.statusText);
            // FIXME: Parse as MF2 resource, not JSON
            const json = await res.json();
            this.#resources.set(link.href, json);
            link.dispatchEvent(new Event("load"));
            console.log("LOAD", link.href, json);
          } catch (error) {
            console.error(
              `Loading messages from ${link.href} failed: ${error}`,
            );
            this.#resources.set(link.href, null);
          }
        }),
    );
  }

  /** @param {HTMLElement} el */
  getMessage(el) {
    const msg = el.msg;
    const lang = el.closest("[lang]")?.lang.toLowerCase() ?? "";
    const msgLangs = this.#langMap.get(lang) ?? this.#langMap.get("") ?? [];
    let loadLang = null;
    for (const msgLang of msgLangs) {
      for (const link of this.#linkMap.get(msgLang)) {
        // null if load failed
        const resource = this.#resources.get(link.href);
        if (resource === undefined) {
          loadLang ??= msgLang;
        } else if (resource && msg in resource) {
          return { message: resource[msg], loadLang };
        }
      }
    }
    return { message: `{${msg}}`, loadLang };
  }

  /**
   * @param {Set<HTMLElement>} [msgElements] - Optional. If not set, all elements with a `msg` attribute are updated.
   */
  update(msgElements) {
    const msgMutations = this.#msgObserver.takeRecords();
    this.#msgObserver.disconnect();
    if (!msgElements) {
      msgElements = this.#doc.querySelectorAll("[msg]");
    } else if (msgMutations.length) {
      msgElements = msgElements.union(getMsgElements(msgMutations));
    }

    const loadLangs = new Set();
    const refresh = new Set();
    for (const el of msgElements) {
      if (el.msg) {
        const res = this.getMessage(el);
        console.log("MSG", el.msg, el.msgOpts, res);
        el.innerText = res.message;
        if (res.loadLang !== null) {
          loadLangs.add(res.loadLang);
          refresh.add(el);
        }
      }
    }

    this.#msgObserver.observe(this.#doc, msgObserverOptions);

    if (loadLangs.size) {
      console.log("FALLBACK", loadLangs, refresh);
      this.#loadLinks(loadLangs).then(() => this.update(refresh));
    }
  }
}

/** @param {MutationRecord[]} mutations  */
async function langCallback(mutations) {
  /** @type {HTMLElement[]} */
  const langRoots = mutations.map((m) => m.target);
  const doc = langRoots[0].ownerDocument;
  await doc.l10n.loadResources();
  const msgElements = new Set();
  for (const langRoot of langRoots) {
    if (langRoot.msg) msgElements.add(langRoot);
    for (const el of langRoot.querySelectorAll("[msg]")) msgElements.add(el);
  }
  if (msgElements.size) doc.l10n.update(msgElements);
}

/** @param {MutationRecord[]} mutations  */
async function linkCallback(mutations) {
  /** @param {HTMLElement} el  */
  const isMsgLink = (el) => el.nodeName === "LINK" && el.rel === "messages";
  const link = (() => {
    for (const m of mutations) {
      if (isMsgLink(m.target)) return m.target;
      for (const el of m.addedNodes) if (isMsgLink(el)) return el;
    }
    return null;
  })();
  if (link) {
    const doc = link.ownerDocument;
    await doc.l10n.loadResources();
    // TODO: Should filter this update somehow.
    doc.l10n.update();
  }
}

/** @param {MutationRecord[]} mutations  */
function msgCallback(mutations) {
  const msgElements = getMsgElements(mutations);
  if (msgElements.size) {
    const doc = msgElements.values().next().value.ownerDocument;
    doc.l10n.update(msgElements);
  }
}

/** @param {MutationRecord[]} mutations  */
function getMsgElements(mutations) {
  /** @type {Set<HTMLElement>} */
  const msgElements = new Set();
  for (const m of mutations) {
    if (m.addedNodes.length) {
      for (const rootEl of m.addedNodes) {
        if (rootEl.msg) msgElements.add(rootEl);
        for (const el of rootEl.querySelectorAll("[msg]")) msgElements.add(el);
      }
    } else {
      const attrName = m.attributeName;
      if (attrName?.startsWith("msg")) {
        const el = m.target;
        msgElements.add(el);
        if (attrName.startsWith("msg-") && el._msgOpts) {
          const optName = attrName.substring(4);
          const value = el.getAttribute(attrName);
          el._msgOpts.set(optName, value, false);
        }
      }
    }
  }
  return msgElements;
}
