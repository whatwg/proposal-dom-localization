import {
  compileMessageResource,
  parseMessageResource,
} from "@messageformat/resource";

/**
 * @import { MessageFormatWrapper, MessageResource } from "@messageformat/resource"
 */

const msgObserverOptions = { attributes: true, childList: true, subtree: true };

export class Localization {
  /** @type {Document} */
  #doc;

  /** @type {Set<HTMLElement>} */
  #badLangElements = new WeakSet();

  /** @type {Map<string, string[]>} */
  #langMap = new Map();
  /** @type {Map<string, HTMLLinkElement[]>} */
  #linkMap = new Map();
  /** @type {Map<string, MessageResource>} */
  #resources = new Map();
  /** @type {Map<MessageResource, Map<string, MessageFormatWrapper>>} */
  #formatters = new Map();

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
      attributeFilter: ["lang", "translate"],
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
      if (link.translate) {
        try {
          const lang = asLocaleId(link.hreflang);
          this.#linkMap.getOrInsert(lang, []).unshift(link);
        } catch {
          console.error(`Invalid hreflang: ${link.hreflang}`);
        }
      }
    }

    this.#langMap.clear();
    for (const el of this.#doc.querySelectorAll("[lang]")) {
      try {
        this.#langMap.getOrInsert(asLocaleId(el.lang), []);
      } catch {
        if (!this.#badLangElements.has(el)) {
          this.#badLangElements.add(el);
          console.error(`Invalid lang: ${el.lang}`);
        }
        this.#langMap.getOrInsert("", []);
      }
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
        .filter((link) => {
          try {
            return link.translate && langs.has(asLocaleId(link.hreflang));
          } catch {
            console.error(`Invalid hreflang: ${link.hreflang}`);
          }
        })
        .map(async (link) => {
          if (this.#resources.has(link.href)) return;
          try {
            // FIXME: Should also handle crossorigin, integrity, and referrerpolicy
            const res = await fetch(link.href);
            if (!res.ok) throw new Error(res.statusText);
            const src = await res.text();
            const msgRes = parseMessageResource(src);
            this.#resources.set(link.href, msgRes);
            link.dispatchEvent(new Event("load"));
            console.log("LOAD", link.href, msgRes);
          } catch (error) {
            const err = `Loading messages from ${link.href} failed: ${error}`;
            console.error(err);
            this.#resources.set(link.href, null);
          }
        }),
    );
  }

  /**
   * @param {string} lang
   * @param {string[]} msgId
   */
  #getMessage(lang, msgId) {
    let loadLang = null;
    const msgLangs = this.#langMap.get(lang) ?? this.#langMap.get("") ?? [];
    for (const msgLang of msgLangs) {
      for (const link of this.#linkMap.get(msgLang)) {
        // null if load failed
        const resource = this.#resources.get(link.href);
        if (resource === undefined) {
          loadLang ??= msgLang;
        } else if (resource && resource.has(msgId[0])) {
          /** @type {Map<string, MessageFormatWrapper>} */
          const mfRes = this.#formatters.getOrInsertComputed(resource, () =>
            compileMessageResource(resource, {
              /* TODO: message constructor options */
            }),
          );
          /** @type {MessageFormatWrapper | undefined} */
          let message = mfRes;
          for (const idPart of msgId) message = message?.get(idPart);
          return { message, loadLang };
        }
      }
    }
    return { message: undefined, loadLang };
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
      if (!el.msg || !el.translate) continue;
      let lang;
      const langRoot = el.closest("[lang]");
      if (langRoot) {
        try {
          lang = asLocaleId(langRoot.lang);
        } catch {
          if (!this.#badLangElements.has(langRoot)) {
            this.#badLangElements.add(langRoot);
            console.error(`Invalid lang: ${langRoot.lang}`);
          }
          lang = "";
        }
      }
      const msgId = el.msg.split(".");
      const { message, loadLang } = this.#getMessage(lang, msgId);
      if (message) {
        const opts = el.msgOpts.size
          ? Object.fromEntries(el.msgOpts)
          : undefined;
        if (message.value) {
          try {
            console.log("FMT", el.msg, opts);
            el.innerText = message.value.format(opts, warnOnFallback(el.msg));
          } catch (cause) {
            const errMsg = `Fatal: Formatting message ${el.msg} failed`;
            console.error(new Error(errMsg, { cause }));
            el.innerText = `{${el.msg}}`;
          }
        }
        for (const [name, prop] of message) {
          if (prop.value && isTranslatableAttribute(el, name)) {
            try {
              const val = prop.value.format(opts, warnOnFallback(el.msg, name));
              el.setAttribute(name, val);
            } catch (cause) {
              const errMsg = `Fatal: Formatting message ${el.msg}.${name} failed`;
              console.error(new Error(errMsg, { cause }));
            }
          }
        }
      }
      if (loadLang !== null) {
        loadLangs.add(loadLang);
        refresh.add(el);
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

/**
 * Validate and canonicalize a locale identifier
 *
 * @param {string | undefined} lang
 */
function asLocaleId(lang) {
  if (!lang) return "";
  const locale = new Intl.Locale(lang);
  return locale.minimize().toString();
}

/**
 * @param {string} msgId
 * @param {string} attributeName
 */
function warnOnFallback(msgId, attributeName = "") {
  return (cause) => {
    const msgId_ = attributeName ? `${msgId}.${attributeName}` : msgId;
    const message = `Formatting message ${msgId_} used fallback`;
    cause.stack = "";
    const error = new Error(message, { cause });
    error.stack = "";
    console.warn(error);
  };
}

/**
 * As defined by https://html.spec.whatwg.org/#translatable-attributes
 *
 * @param {HTMLElement} el
 * @param {string} name
 */
function isTranslatableAttribute(el, name) {
  const tag = el.tagName;

  switch (name) {
    case "lang": // must be "translated" to match the language used in the translation
    case "style": // must be parsed and recursively processed (e.g. for the values of 'content' properties)
    case "title":
      return true;

    case "abbr":
      // Alternative label to use for the header cell when referencing the cell in other contexts
      return tag === "TH";
    case "alt":
      return tag === "AREA" || tag === "IMG" || tag === "INPUT";
    case "content":
      return (
        tag === "META" &&
        // TODO: Clarify in spec whether these are actually "known to be translatable"
        ((el.name === "application-name" && !el.hasAttribute("lang")) ||
          el.name === "description" ||
          el.name === "keywords")
      );
    case "download":
      // Whether to download the resource instead of navigating to it, and its filename if so
      return tag === "A" || tag === "AREA";
    case "label":
      return tag === "OPTGROUP" || tag === "OPTION" || tag === "TRACK";
    case "placeholder":
      return tag === "INPUT" || tag === "TEXTAREA";
    case "srcdoc":
      // A document to render in the iframe
      // must be parsed and recursively processed
      // TODO: This should probably not be localized.
      return tag === "IFRAME";
    case "value":
      return tag === "INPUT" && (el.type === "button" || el.type === "reset");
    default:
      return false;
  }
}
