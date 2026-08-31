const At = globalThis, dn = At.ShadowRoot && (At.ShadyCSS === void 0 || At.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, fn = /* @__PURE__ */ Symbol(), ur = /* @__PURE__ */ new WeakMap();
let qr = class {
  constructor(e, n, s) {
    if (this._$cssResult$ = !0, s !== fn) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = n;
  }
  get styleSheet() {
    let e = this.o;
    const n = this.t;
    if (dn && e === void 0) {
      const s = n !== void 0 && n.length === 1;
      s && (e = ur.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && ur.set(n, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Ws = (t) => new qr(typeof t == "string" ? t : t + "", void 0, fn), gn = (t, ...e) => {
  const n = t.length === 1 ? t[0] : e.reduce((s, r, o) => s + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[o + 1], t[0]);
  return new qr(n, t, fn);
}, Gs = (t, e) => {
  if (dn) t.adoptedStyleSheets = e.map((n) => n instanceof CSSStyleSheet ? n : n.styleSheet);
  else for (const n of e) {
    const s = document.createElement("style"), r = At.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = n.cssText, t.appendChild(s);
  }
}, pr = dn ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let n = "";
  for (const s of e.cssRules) n += s.cssText;
  return Ws(n);
})(t) : t;
const { is: Zs, defineProperty: Vs, getOwnPropertyDescriptor: Xs, getOwnPropertyNames: Ys, getOwnPropertySymbols: Ks, getPrototypeOf: Qs } = Object, It = globalThis, hr = It.trustedTypes, Js = hr ? hr.emptyScript : "", ei = It.reactiveElementPolyfillSupport, nt = (t, e) => t, Tt = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Js : null;
      break;
    case Object:
    case Array:
      t = t == null ? t : JSON.stringify(t);
  }
  return t;
}, fromAttribute(t, e) {
  let n = t;
  switch (e) {
    case Boolean:
      n = t !== null;
      break;
    case Number:
      n = t === null ? null : Number(t);
      break;
    case Object:
    case Array:
      try {
        n = JSON.parse(t);
      } catch {
        n = null;
      }
  }
  return n;
} }, mn = (t, e) => !Zs(t, e), dr = { attribute: !0, type: String, converter: Tt, reflect: !1, useDefault: !1, hasChanged: mn };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), It.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let Ne = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, n = dr) {
    if (n.state && (n.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((n = Object.create(n)).wrapped = !0), this.elementProperties.set(e, n), !n.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), r = this.getPropertyDescriptor(e, s, n);
      r !== void 0 && Vs(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, n, s) {
    const { get: r, set: o } = Xs(this.prototype, e) ?? { get() {
      return this[n];
    }, set(a) {
      this[n] = a;
    } };
    return { get: r, set(a) {
      const u = r?.call(this);
      o?.call(this, a), this.requestUpdate(e, u, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? dr;
  }
  static _$Ei() {
    if (this.hasOwnProperty(nt("elementProperties"))) return;
    const e = Qs(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(nt("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(nt("properties"))) {
      const n = this.properties, s = [...Ys(n), ...Ks(n)];
      for (const r of s) this.createProperty(r, n[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const n = litPropertyMetadata.get(e);
      if (n !== void 0) for (const [s, r] of n) this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [n, s] of this.elementProperties) {
      const r = this._$Eu(n, s);
      r !== void 0 && this._$Eh.set(r, n);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const n = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const r of s) n.unshift(pr(r));
    } else e !== void 0 && n.push(pr(e));
    return n;
  }
  static _$Eu(e, n) {
    const s = n.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
  }
  addController(e) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), n = this.constructor.elementProperties;
    for (const s of n.keys()) this.hasOwnProperty(s) && (e.set(s, this[s]), delete this[s]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Gs(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, n, s) {
    this._$AK(e, s);
  }
  _$ET(e, n) {
    const s = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, s);
    if (r !== void 0 && s.reflect === !0) {
      const o = (s.converter?.toAttribute !== void 0 ? s.converter : Tt).toAttribute(n, s.type);
      this._$Em = e, o == null ? this.removeAttribute(r) : this.setAttribute(r, o), this._$Em = null;
    }
  }
  _$AK(e, n) {
    const s = this.constructor, r = s._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = s.getPropertyOptions(r), a = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : Tt;
      this._$Em = r;
      const u = a.fromAttribute(n, o.type);
      this[r] = u ?? this._$Ej?.get(r) ?? u, this._$Em = null;
    }
  }
  requestUpdate(e, n, s, r = !1, o) {
    if (e !== void 0) {
      const a = this.constructor;
      if (r === !1 && (o = this[e]), s ??= a.getPropertyOptions(e), !((s.hasChanged ?? mn)(o, n) || s.useDefault && s.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, s)))) return;
      this.C(e, n, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, n, { useDefault: s, reflect: r, wrapped: o }, a) {
    s && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? n ?? this[e]), o !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (n = void 0), this._$AL.set(e, n)), r === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (n) {
      Promise.reject(n);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [r, o] of this._$Ep) this[r] = o;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [r, o] of s) {
        const { wrapped: a } = o, u = this[r];
        a !== !0 || this._$AL.has(r) || u === void 0 || this.C(r, void 0, o, u);
      }
    }
    let e = !1;
    const n = this._$AL;
    try {
      e = this.shouldUpdate(n), e ? (this.willUpdate(n), this._$EO?.forEach((s) => s.hostUpdate?.()), this.update(n)) : this._$EM();
    } catch (s) {
      throw e = !1, this._$EM(), s;
    }
    e && this._$AE(n);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((n) => n.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq &&= this._$Eq.forEach((n) => this._$ET(n, this[n])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
Ne.elementStyles = [], Ne.shadowRootOptions = { mode: "open" }, Ne[nt("elementProperties")] = /* @__PURE__ */ new Map(), Ne[nt("finalized")] = /* @__PURE__ */ new Map(), ei?.({ ReactiveElement: Ne }), (It.reactiveElementVersions ??= []).push("2.1.2");
const bn = globalThis, fr = (t) => t, St = bn.trustedTypes, gr = St ? St.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, jr = "$lit$", ge = `lit$${Math.random().toFixed(9).slice(2)}$`, Wr = "?" + ge, ti = `<${Wr}>`, Te = document, it = () => Te.createComment(""), at = (t) => t === null || typeof t != "object" && typeof t != "function", yn = Array.isArray, ni = (t) => yn(t) || typeof t?.[Symbol.iterator] == "function", Qt = `[ \t\n\f\r]`, Ve = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, mr = /-->/g, br = />/g, we = RegExp(`>|${Qt}(?:([^\\s"'>=/]+)(${Qt}*=${Qt}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), yr = /'/g, xr = /"/g, Gr = /^(?:script|style|textarea|title)$/i, ri = (t) => (e, ...n) => ({ _$litType$: t, strings: e, values: n }), O = ri(1), Se = /* @__PURE__ */ Symbol.for("lit-noChange"), S = /* @__PURE__ */ Symbol.for("lit-nothing"), _r = /* @__PURE__ */ new WeakMap(), Ae = Te.createTreeWalker(Te, 129);
function Zr(t, e) {
  if (!yn(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return gr !== void 0 ? gr.createHTML(e) : e;
}
const si = (t, e) => {
  const n = t.length - 1, s = [];
  let r, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = Ve;
  for (let u = 0; u < n; u++) {
    const c = t[u];
    let g, d, m = -1, y = 0;
    for (; y < c.length && (a.lastIndex = y, d = a.exec(c), d !== null); ) y = a.lastIndex, a === Ve ? d[1] === "!--" ? a = mr : d[1] !== void 0 ? a = br : d[2] !== void 0 ? (Gr.test(d[2]) && (r = RegExp("</" + d[2], "g")), a = we) : d[3] !== void 0 && (a = we) : a === we ? d[0] === ">" ? (a = r ?? Ve, m = -1) : d[1] === void 0 ? m = -2 : (m = a.lastIndex - d[2].length, g = d[1], a = d[3] === void 0 ? we : d[3] === '"' ? xr : yr) : a === xr || a === yr ? a = we : a === mr || a === br ? a = Ve : (a = we, r = void 0);
    const A = a === we && t[u + 1].startsWith("/>") ? " " : "";
    o += a === Ve ? c + ti : m >= 0 ? (s.push(g), c.slice(0, m) + jr + c.slice(m) + ge + A) : c + ge + (m === -2 ? u : A);
  }
  return [Zr(t, o + (t[n] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
let an = class Vr {
  constructor({ strings: e, _$litType$: n }, s) {
    let r;
    this.parts = [];
    let o = 0, a = 0;
    const u = e.length - 1, c = this.parts, [g, d] = si(e, n);
    if (this.el = Vr.createElement(g, s), Ae.currentNode = this.el.content, n === 2 || n === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (r = Ae.nextNode()) !== null && c.length < u; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const m of r.getAttributeNames()) if (m.endsWith(jr)) {
          const y = d[a++], A = r.getAttribute(m).split(ge), k = /([.?@])?(.*)/.exec(y);
          c.push({ type: 1, index: o, name: k[2], strings: A, ctor: k[1] === "." ? ai : k[1] === "?" ? oi : k[1] === "@" ? li : Ct }), r.removeAttribute(m);
        } else m.startsWith(ge) && (c.push({ type: 6, index: o }), r.removeAttribute(m));
        if (Gr.test(r.tagName)) {
          const m = r.textContent.split(ge), y = m.length - 1;
          if (y > 0) {
            r.textContent = St ? St.emptyScript : "";
            for (let A = 0; A < y; A++) r.append(m[A], it()), Ae.nextNode(), c.push({ type: 2, index: ++o });
            r.append(m[y], it());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Wr) c.push({ type: 2, index: o });
      else {
        let m = -1;
        for (; (m = r.data.indexOf(ge, m + 1)) !== -1; ) c.push({ type: 7, index: o }), m += ge.length - 1;
      }
      o++;
    }
  }
  static createElement(e, n) {
    const s = Te.createElement("template");
    return s.innerHTML = e, s;
  }
};
function Be(t, e, n = t, s) {
  if (e === Se) return e;
  let r = s !== void 0 ? n._$Co?.[s] : n._$Cl;
  const o = at(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== o && (r?._$AO?.(!1), o === void 0 ? r = void 0 : (r = new o(t), r._$AT(t, n, s)), s !== void 0 ? (n._$Co ??= [])[s] = r : n._$Cl = r), r !== void 0 && (e = Be(t, r._$AS(t, e.values), r, s)), e;
}
class ii {
  constructor(e, n) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = n;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: n }, parts: s } = this._$AD, r = (e?.creationScope ?? Te).importNode(n, !0);
    Ae.currentNode = r;
    let o = Ae.nextNode(), a = 0, u = 0, c = s[0];
    for (; c !== void 0; ) {
      if (a === c.index) {
        let g;
        c.type === 2 ? g = new xn(o, o.nextSibling, this, e) : c.type === 1 ? g = new c.ctor(o, c.name, c.strings, this, e) : c.type === 6 && (g = new ci(o, this, e)), this._$AV.push(g), c = s[++u];
      }
      a !== c?.index && (o = Ae.nextNode(), a++);
    }
    return Ae.currentNode = Te, r;
  }
  p(e) {
    let n = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, n), n += s.strings.length - 2) : s._$AI(e[n])), n++;
  }
}
let xn = class Xr {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, n, s, r) {
    this.type = 2, this._$AH = S, this._$AN = void 0, this._$AA = e, this._$AB = n, this._$AM = s, this.options = r, this._$Cv = r?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const n = this._$AM;
    return n !== void 0 && e?.nodeType === 11 && (e = n.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, n = this) {
    e = Be(this, e, n), at(e) ? e === S || e == null || e === "" ? (this._$AH !== S && this._$AR(), this._$AH = S) : e !== this._$AH && e !== Se && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : ni(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== S && at(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Te.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: n, _$litType$: s } = e, r = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = an.createElement(Zr(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === r) this._$AH.p(n);
    else {
      const o = new ii(r, this), a = o.u(this.options);
      o.p(n), this.T(a), this._$AH = o;
    }
  }
  _$AC(e) {
    let n = _r.get(e.strings);
    return n === void 0 && _r.set(e.strings, n = new an(e)), n;
  }
  k(e) {
    yn(this._$AH) || (this._$AH = [], this._$AR());
    const n = this._$AH;
    let s, r = 0;
    for (const o of e) r === n.length ? n.push(s = new Xr(this.O(it()), this.O(it()), this, this.options)) : s = n[r], s._$AI(o), r++;
    r < n.length && (this._$AR(s && s._$AB.nextSibling, r), n.length = r);
  }
  _$AR(e = this._$AA.nextSibling, n) {
    for (this._$AP?.(!1, !0, n); e !== this._$AB; ) {
      const s = fr(e).nextSibling;
      fr(e).remove(), e = s;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
};
class Ct {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, n, s, r, o) {
    this.type = 1, this._$AH = S, this._$AN = void 0, this.element = e, this.name = n, this._$AM = r, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = S;
  }
  _$AI(e, n = this, s, r) {
    const o = this.strings;
    let a = !1;
    if (o === void 0) e = Be(this, e, n, 0), a = !at(e) || e !== this._$AH && e !== Se, a && (this._$AH = e);
    else {
      const u = e;
      let c, g;
      for (e = o[0], c = 0; c < o.length - 1; c++) g = Be(this, u[s + c], n, c), g === Se && (g = this._$AH[c]), a ||= !at(g) || g !== this._$AH[c], g === S ? e = S : e !== S && (e += (g ?? "") + o[c + 1]), this._$AH[c] = g;
    }
    a && !r && this.j(e);
  }
  j(e) {
    e === S ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
let ai = class extends Ct {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === S ? void 0 : e;
  }
}, oi = class extends Ct {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== S);
  }
}, li = class extends Ct {
  constructor(e, n, s, r, o) {
    super(e, n, s, r, o), this.type = 5;
  }
  _$AI(e, n = this) {
    if ((e = Be(this, e, n, 0) ?? S) === Se) return;
    const s = this._$AH, r = e === S && s !== S || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, o = e !== S && (s === S || r);
    r && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
};
class ci {
  constructor(e, n, s) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = n, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    Be(this, e);
  }
}
const ui = bn.litHtmlPolyfillSupport;
ui?.(an, xn), (bn.litHtmlVersions ??= []).push("3.3.3");
const pi = (t, e, n) => {
  const s = n?.renderBefore ?? e;
  let r = s._$litPart$;
  if (r === void 0) {
    const o = n?.renderBefore ?? null;
    s._$litPart$ = r = new xn(e.insertBefore(it(), o), o, void 0, n ?? {});
  }
  return r._$AI(t), r;
};
const _n = globalThis;
let Ue = class extends Ne {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const n = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = pi(n, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Se;
  }
};
Ue._$litElement$ = !0, Ue.finalized = !0, _n.litElementHydrateSupport?.({ LitElement: Ue });
const hi = _n.litElementPolyfillSupport;
hi?.({ LitElement: Ue });
(_n.litElementVersions ??= []).push("4.2.2");
const Yr = (t) => (e, n) => {
  n !== void 0 ? n.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
const di = { attribute: !0, type: String, converter: Tt, reflect: !1, hasChanged: mn }, fi = (t = di, e, n) => {
  const { kind: s, metadata: r } = n;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), s === "setter" && ((t = Object.create(t)).wrapped = !0), o.set(n.name, t), s === "accessor") {
    const { name: a } = n;
    return { set(u) {
      const c = e.get.call(this);
      e.set.call(this, u), this.requestUpdate(a, c, t, !0, u);
    }, init(u) {
      return u !== void 0 && this.C(a, void 0, t, u), u;
    } };
  }
  if (s === "setter") {
    const { name: a } = n;
    return function(u) {
      const c = this[a];
      e.call(this, u), this.requestUpdate(a, c, t, !0, u);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function B(t) {
  return (e, n) => typeof n == "object" ? fi(t, e, n) : ((s, r, o) => {
    const a = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, s), a ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(t, e, n);
}
function ot(t) {
  return B({ ...t, state: !0, attribute: !1 });
}
function wr(t, e) {
  (e == null || e > t.length) && (e = t.length);
  for (var n = 0, s = Array(e); n < e; n++) s[n] = t[n];
  return s;
}
function gi(t) {
  if (Array.isArray(t)) return t;
}
function mi(t, e) {
  var n = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
  if (n != null) {
    var s, r, o, a, u = [], c = !0, g = !1;
    try {
      if (o = (n = n.call(t)).next, e !== 0) for (; !(c = (s = o.call(n)).done) && (u.push(s.value), u.length !== e); c = !0) ;
    } catch (d) {
      g = !0, r = d;
    } finally {
      try {
        if (!c && n.return != null && (a = n.return(), Object(a) !== a)) return;
      } finally {
        if (g) throw r;
      }
    }
    return u;
  }
}
function bi() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function yi(t, e) {
  return gi(t) || mi(t, e) || xi(t, e) || bi();
}
function xi(t, e) {
  if (t) {
    if (typeof t == "string") return wr(t, e);
    var n = {}.toString.call(t).slice(8, -1);
    return n === "Object" && t.constructor && (n = t.constructor.name), n === "Map" || n === "Set" ? Array.from(t) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? wr(t, e) : void 0;
  }
}
const Kr = Object.entries, kr = Object.setPrototypeOf, _i = Object.isFrozen, wi = Object.getPrototypeOf, ki = Object.getOwnPropertyDescriptor;
let D = Object.freeze, M = Object.seal, ze = Object.create, Qr = typeof Reflect < "u" && Reflect, on = Qr.apply, ln = Qr.construct;
D || (D = function(e) {
  return e;
});
M || (M = function(e) {
  return e;
});
on || (on = function(e, n) {
  for (var s = arguments.length, r = new Array(s > 2 ? s - 2 : 0), o = 2; o < s; o++)
    r[o - 2] = arguments[o];
  return e.apply(n, r);
});
ln || (ln = function(e) {
  for (var n = arguments.length, s = new Array(n > 1 ? n - 1 : 0), r = 1; r < n; r++)
    s[r - 1] = arguments[r];
  return new e(...s);
});
const ve = P(Array.prototype.forEach), vi = P(Array.prototype.lastIndexOf), vr = P(Array.prototype.pop), Xe = P(Array.prototype.push), Ai = P(Array.prototype.splice), He = Array.isArray, et = P(String.prototype.toLowerCase), Jt = P(String.prototype.toString), Ar = P(String.prototype.match), Ye = P(String.prototype.replace), Tr = P(String.prototype.indexOf), Ti = P(String.prototype.trim), Si = P(Number.prototype.toString), Ei = P(Boolean.prototype.toString), Sr = typeof BigInt > "u" ? null : P(BigInt.prototype.toString), Er = typeof Symbol > "u" ? null : P(Symbol.prototype.toString), Z = P(Object.prototype.hasOwnProperty), Ke = P(Object.prototype.toString), N = P(RegExp.prototype.test), ke = $i(TypeError);
function P(t) {
  return function(e) {
    e instanceof RegExp && (e.lastIndex = 0);
    for (var n = arguments.length, s = new Array(n > 1 ? n - 1 : 0), r = 1; r < n; r++)
      s[r - 1] = arguments[r];
    return on(t, e, s);
  };
}
function $i(t) {
  return function() {
    for (var e = arguments.length, n = new Array(e), s = 0; s < e; s++)
      n[s] = arguments[s];
    return ln(t, n);
  };
}
function _(t, e) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : et;
  if (kr && kr(t, null), !He(e))
    return t;
  let s = e.length;
  for (; s--; ) {
    let r = e[s];
    if (typeof r == "string") {
      const o = n(r);
      o !== r && (_i(e) || (e[s] = o), r = o);
    }
    t[r] = !0;
  }
  return t;
}
function Ri(t) {
  for (let e = 0; e < t.length; e++)
    Z(t, e) || (t[e] = null);
  return t;
}
function X(t) {
  const e = ze(null);
  for (const s of Kr(t)) {
    var n = yi(s, 2);
    const r = n[0], o = n[1];
    Z(t, r) && (He(o) ? e[r] = Ri(o) : o && typeof o == "object" && o.constructor === Object ? e[r] = X(o) : e[r] = o);
  }
  return e;
}
function Ii(t) {
  switch (typeof t) {
    case "string":
      return t;
    case "number":
      return Si(t);
    case "boolean":
      return Ei(t);
    case "bigint":
      return Sr ? Sr(t) : "0";
    case "symbol":
      return Er ? Er(t) : "Symbol()";
    case "undefined":
      return Ke(t);
    case "function":
    case "object": {
      if (t === null)
        return Ke(t);
      const e = t, n = K(e, "toString");
      if (typeof n == "function") {
        const s = n(e);
        return typeof s == "string" ? s : Ke(s);
      }
      return Ke(t);
    }
    default:
      return Ke(t);
  }
}
function K(t, e) {
  for (; t !== null; ) {
    const s = ki(t, e);
    if (s) {
      if (s.get)
        return P(s.get);
      if (typeof s.value == "function")
        return P(s.value);
    }
    t = wi(t);
  }
  function n() {
    return null;
  }
  return n;
}
function Ci(t) {
  try {
    return N(t, ""), !0;
  } catch {
    return !1;
  }
}
const $r = D(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), en = D(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), tn = D(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), Oi = D(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), nn = D(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), Pi = D(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), Rr = D(["#text"]), Ir = D(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "command", "commandfor", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns"]), rn = D(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dominant-baseline", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "pointer-events", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-orientation", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "vector-effect", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), Cr = D(["accent", "accentunder", "align", "bevelled", "close", "columnalign", "columnlines", "columnspacing", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lquote", "lspace", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), kt = D(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), Li = M(/{{[\w\W]*|^[\w\W]*}}/g), Di = M(/<%[\w\W]*|^[\w\W]*%>/g), Mi = M(/\${[\w\W]*/g), Ni = M(/^data-[\-\w.\u00B7-\uFFFF]+$/), zi = M(/^aria-[\-\w]+$/), Or = M(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), Ui = M(/^(?:\w+script|data):/i), Hi = M(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), Bi = M(/^html$/i), Fi = M(/^[a-z][.\w]*(-[.\w]+)+$/i), Pr = M(/<[/\w!]/g), Lr = M(/<[/\w]/g), qi = M(/<\/no(script|embed|frames)/i), ji = M(/\/>/i), V = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  // Deprecated
  entityNode: 6,
  // Deprecated
  processingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
  // Deprecated
}, Jr = ["style", "script", "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript"], Wi = D(_({}, Jr)), Gi = (function() {
  const t = {};
  return ve(Jr, (e) => {
    t[e] = M(new RegExp("</" + e + "(?=[\\t\\n\\f\\r />])", "i"));
  }), D(t);
})(), Zi = function() {
  return typeof window > "u" ? null : window;
}, Vi = function(e, n) {
  if (typeof e != "object" || typeof e.createPolicy != "function")
    return null;
  let s = null;
  const r = "data-tt-policy-suffix";
  n && n.hasAttribute(r) && (s = n.getAttribute(r));
  const o = "dompurify" + (s ? "#" + s : "");
  try {
    return e.createPolicy(o, {
      createHTML(a) {
        return a;
      },
      createScriptURL(a) {
        return a;
      }
    });
  } catch {
    return console.warn("TrustedTypes policy " + o + " could not be created."), null;
  }
}, Dr = function() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
}, fe = function(e, n, s, r) {
  return Z(e, n) && He(e[n]) ? _(r.base ? X(r.base) : {}, e[n], r.transform) : s;
}, sn = function(e, n, s) {
  const r = Z(e, n) ? e[n] : void 0;
  return r && typeof r == "object" ? X(r) : s();
};
function es() {
  let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Zi();
  const e = (h) => es(h);
  if (e.version = "3.4.14", e.removed = [], !t || !t.document || t.document.nodeType !== V.document || !t.Element)
    return e.isSupported = !1, e;
  let n = t.document;
  const s = n, r = s.currentScript;
  t.DocumentFragment;
  const o = t.HTMLTemplateElement, a = t.Node, u = t.Element, c = t.NodeFilter, g = t.NamedNodeMap;
  g === void 0 && (t.NamedNodeMap || t.MozNamedAttrMap), t.HTMLFormElement;
  const d = t.DOMParser, m = t.trustedTypes, y = u.prototype, A = K(y, "cloneNode"), k = K(y, "remove"), q = K(y, "nextSibling"), oe = K(y, "childNodes"), te = K(y, "parentNode"), qe = K(y, "shadowRoot"), Re = K(y, "attributes"), ne = a && a.prototype ? K(a.prototype, "nodeType") : null, ce = a && a.prototype ? K(a.prototype, "nodeName") : null, ue = a && a.prototype ? K(a.prototype, "ownerDocument") : null, Y = function(i) {
    return ne ? ne(i) : i.nodeType;
  }, Lt = function(i) {
    return ce ? ce(i) : i.nodeName;
  };
  if (typeof o == "function") {
    const h = n.createElement("template");
    h.content && h.content.ownerDocument && (n = h.content.ownerDocument);
  }
  let j, be = "", Dt, On = !1, je = 0;
  const Pn = function() {
    if (je > 0)
      throw ke('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  }, Ie = function(i) {
    Pn(), je++;
    try {
      return j.createHTML(i);
    } finally {
      je--;
    }
  }, bs = function(i) {
    Pn(), je++;
    try {
      return j.createScriptURL(i);
    } finally {
      je--;
    }
  }, ys = function() {
    return On || (Dt = Vi(m, r), On = !0), Dt;
  }, ct = n, Mt = ct.implementation, Ln = ct.createNodeIterator, xs = ct.createDocumentFragment, _s = ct.getElementsByTagName, ws = s.importNode;
  let E = Dr();
  e.isSupported = typeof Kr == "function" && typeof te == "function" && Mt && Mt.createHTMLDocument !== void 0;
  const ks = Li, vs = Di, As = Mi, Ts = Ni, Ss = zi, Es = Ui, Dn = Hi, $s = Fi;
  let Mn = Or, $ = null;
  const Nt = _({}, [...$r, ...en, ...tn, ...nn, ...Rr]);
  let R = null;
  const zt = _({}, [...Ir, ...rn, ...Cr, ...kt]);
  let re = Object.seal(ze(null, {
    tagNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: !1
    }
  })), We = null, Nn = null;
  const pe = Object.seal(ze(null, {
    tagCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    }
  }));
  let zn = !0, Ut = !0, Un = !1, Hn = !0, he = !1, ye = !0, xe = !1, Ht = !1, ut = null, pt = null, Bt = !1, Ce = !1, ht = !1, dt = !1, Bn = !0, Fn = !1;
  const qn = "user-content-";
  let Ft = !0, qt = !1, Oe = {}, Pe = null;
  const jn = _({}, [
    "annotation-xml",
    "audio",
    "colgroup",
    "desc",
    "foreignobject",
    "head",
    "iframe",
    "math",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "noembed",
    "noframes",
    "noscript",
    "plaintext",
    "script",
    // <selectedcontent> mirrors the selected <option>'s subtree, cloned by
    // the UA (customizable <select>) — including any on* handlers — and the
    // engine re-mirrors synchronously whenever a removal changes which
    // option/selectedcontent is current, even inside DOMPurify's inert
    // DOMParser document. Hoisting its children on removal re-inserts a fresh
    // mirror target ahead of the walk, which the engine refills, looping
    // forever (DoS) and amplifying output. Dropping its content on removal
    // (rather than hoisting) breaks that cascade; the content is a duplicate
    // of the option, which is sanitized on its own. See campaign-3 F1/F6.
    "selectedcontent",
    "style",
    "svg",
    "template",
    "thead",
    "title",
    "video",
    "xmp"
  ]);
  let Wn = null;
  const Gn = _({}, ["audio", "video", "img", "source", "image", "track"]);
  let Zn = null;
  const Vn = _({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), ft = "http://www.w3.org/1998/Math/MathML", gt = "http://www.w3.org/2000/svg", se = "http://www.w3.org/1999/xhtml";
  let Le = se, jt = !1, Wt = null;
  const Rs = _({}, [ft, gt, se], Jt), Xn = D(["mi", "mo", "mn", "ms", "mtext"]);
  let Gt = _({}, Xn);
  const Yn = D(["annotation-xml"]);
  let Zt = _({}, Yn);
  const Is = _({}, ["title", "style", "font", "a", "script"]);
  let Ge = null;
  const Cs = ["application/xhtml+xml", "text/html"], Os = "text/html";
  let C = null, De = null;
  const Ps = n.createElement("form"), Kn = function(i) {
    return i instanceof RegExp || i instanceof Function;
  }, Vt = function() {
    let i = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (De && De === i)
      return;
    (!i || typeof i != "object") && (i = {}), i = X(i), Ge = // eslint-disable-next-line unicorn/prefer-includes
    Cs.indexOf(i.PARSER_MEDIA_TYPE) === -1 ? Os : i.PARSER_MEDIA_TYPE, C = Ge === "application/xhtml+xml" ? Jt : et, $ = fe(i, "ALLOWED_TAGS", Nt, {
      transform: C
    }), R = fe(i, "ALLOWED_ATTR", zt, {
      transform: C
    }), Wt = fe(i, "ALLOWED_NAMESPACES", Rs, {
      transform: Jt
    }), Zn = fe(i, "ADD_URI_SAFE_ATTR", Vn, {
      transform: C,
      base: Vn
    }), Wn = fe(i, "ADD_DATA_URI_TAGS", Gn, {
      transform: C,
      base: Gn
    }), Pe = fe(i, "FORBID_CONTENTS", jn, {
      transform: C
    }), We = fe(i, "FORBID_TAGS", X({}), {
      transform: C
    }), Nn = fe(i, "FORBID_ATTR", X({}), {
      transform: C
    }), Oe = Z(i, "USE_PROFILES") ? i.USE_PROFILES && typeof i.USE_PROFILES == "object" ? X(i.USE_PROFILES) : i.USE_PROFILES : !1, zn = i.ALLOW_ARIA_ATTR !== !1, Ut = i.ALLOW_DATA_ATTR !== !1, Un = i.ALLOW_UNKNOWN_PROTOCOLS || !1, Hn = i.ALLOW_SELF_CLOSE_IN_ATTR !== !1, he = i.SAFE_FOR_TEMPLATES || !1, ye = i.SAFE_FOR_XML !== !1, xe = i.WHOLE_DOCUMENT || !1, Ce = i.RETURN_DOM || !1, ht = i.RETURN_DOM_FRAGMENT || !1, dt = i.RETURN_TRUSTED_TYPE || !1, Bt = i.FORCE_BODY || !1, Bn = i.SANITIZE_DOM !== !1, Fn = i.SANITIZE_NAMED_PROPS || !1, Ft = i.KEEP_CONTENT !== !1, qt = i.IN_PLACE || !1, Mn = Ci(i.ALLOWED_URI_REGEXP) ? i.ALLOWED_URI_REGEXP : Or, Le = typeof i.NAMESPACE == "string" ? i.NAMESPACE : se, Gt = sn(
      i,
      "MATHML_TEXT_INTEGRATION_POINTS",
      () => _({}, Xn)
      // Default built-in map
    ), Zt = sn(
      i,
      "HTML_INTEGRATION_POINTS",
      () => _({}, Yn)
      // Default built-in map
    );
    const l = sn(i, "CUSTOM_ELEMENT_HANDLING", () => ze(null));
    if (re = ze(null), Z(l, "tagNameCheck") && Kn(l.tagNameCheck) && (re.tagNameCheck = l.tagNameCheck), Z(l, "attributeNameCheck") && Kn(l.attributeNameCheck) && (re.attributeNameCheck = l.attributeNameCheck), Z(l, "allowCustomizedBuiltInElements") && typeof l.allowCustomizedBuiltInElements == "boolean" && (re.allowCustomizedBuiltInElements = l.allowCustomizedBuiltInElements), M(re), he && (Ut = !1), ht && (Ce = !0), Oe && ($ = _({}, Rr), R = ze(null), Oe.html === !0 && (_($, $r), _(R, Ir)), Oe.svg === !0 && (_($, en), _(R, rn), _(R, kt)), Oe.svgFilters === !0 && (_($, tn), _(R, rn), _(R, kt)), Oe.mathMl === !0 && (_($, nn), _(R, Cr), _(R, kt))), pe.tagCheck = null, pe.attributeCheck = null, Z(i, "ADD_TAGS") && (typeof i.ADD_TAGS == "function" ? pe.tagCheck = i.ADD_TAGS : He(i.ADD_TAGS) && ($ === Nt && ($ = X($)), _($, i.ADD_TAGS, C))), Z(i, "ADD_ATTR") && (typeof i.ADD_ATTR == "function" ? pe.attributeCheck = i.ADD_ATTR : He(i.ADD_ATTR) && (R === zt && (R = X(R)), _(R, i.ADD_ATTR, C))), Z(i, "ADD_FORBID_CONTENTS") && He(i.ADD_FORBID_CONTENTS) && (Pe === jn && (Pe = X(Pe)), _(Pe, i.ADD_FORBID_CONTENTS, C)), Ft && ($["#text"] = !0), xe && _($, ["html", "head", "body"]), $.table && (_($, ["tbody"]), delete We.tbody), i.TRUSTED_TYPES_POLICY) {
      if (typeof i.TRUSTED_TYPES_POLICY.createHTML != "function")
        throw ke('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof i.TRUSTED_TYPES_POLICY.createScriptURL != "function")
        throw ke('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const p = j;
      j = i.TRUSTED_TYPES_POLICY;
      try {
        be = Ie("");
      } catch (f) {
        throw j = p, f;
      }
    } else i.TRUSTED_TYPES_POLICY === null ? (j = void 0, be = "") : (j === void 0 && (j = ys()), j && typeof be == "string" && (be = Ie("")));
    D && D(i), De = i;
  }, Qn = _({}, [...en, ...tn, ...Oi]), Jn = _({}, [...nn, ...Pi]), Ls = function(i, l, p) {
    return l.namespaceURI === se ? i === "svg" : l.namespaceURI === ft ? i === "svg" && (p === "annotation-xml" || Gt[p]) : !!Qn[i];
  }, Ds = function(i, l, p) {
    return l.namespaceURI === se ? i === "math" : l.namespaceURI === gt ? i === "math" && Zt[p] : !!Jn[i];
  }, Ms = function(i, l, p) {
    return l.namespaceURI === gt && !Zt[p] || l.namespaceURI === ft && !Gt[p] ? !1 : !Jn[i] && (Is[i] || !Qn[i]);
  }, Ns = function(i) {
    let l = te(i);
    (!l || !l.tagName) && (l = {
      namespaceURI: Le,
      tagName: "template"
    });
    const p = et(i.tagName), f = et(l.tagName);
    return Wt[i.namespaceURI] ? i.namespaceURI === gt ? Ls(p, l, f) : i.namespaceURI === ft ? Ds(p, l, f) : i.namespaceURI === se ? Ms(p, l, f) : !!(Ge === "application/xhtml+xml" && Wt[i.namespaceURI]) : !1;
  }, de = function(i) {
    Xe(e.removed, {
      element: i
    });
    try {
      te(i).removeChild(i);
    } catch {
      if (k(i), !te(i))
        throw ke("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  }, er = function(i, l, p) {
    try {
      i.removeAttributeNode(l);
    } catch {
      try {
        i.removeAttribute(p);
      } catch {
      }
    }
  }, mt = function(i) {
    bt(i);
    const l = oe(i);
    if (l) {
      const f = [];
      ve(l, (b) => {
        Xe(f, b);
      }), ve(f, (b) => {
        try {
          k(b);
        } catch {
        }
      });
    }
    const p = Re(i);
    if (p)
      for (let f = p.length - 1; f >= 0; --f) {
        const b = p[f], x = b && b.name;
        typeof x == "string" && er(i, b, x);
      }
  }, _e = function(i, l, p) {
    if (!p)
      try {
        p = l.getAttributeNode(i);
      } catch {
        p = null;
      }
    Xe(e.removed, {
      attribute: p || null,
      from: l
    });
    try {
      p ? l.removeAttributeNode(p) : l.removeAttribute(i);
    } catch {
      try {
        l.removeAttribute(i);
      } catch {
      }
    }
    if (i === "is")
      if (Ce || ht)
        try {
          de(l);
        } catch {
        }
      else
        try {
          l.setAttribute(i, "");
        } catch {
        }
  }, zs = function(i) {
    const l = Re(i);
    if (l)
      for (let p = l.length - 1; p >= 0; --p) {
        const f = l[p], b = f && f.name;
        typeof b != "string" || R[C(b)] || er(i, f, b);
      }
  }, bt = function(i) {
    const l = [i];
    for (; l.length > 0; ) {
      const p = l.pop();
      Y(p) === V.element && zs(p);
      const b = oe(p);
      if (b)
        for (let x = b.length - 1; x >= 0; --x)
          l.push(b[x]);
    }
  }, tr = function(i, l) {
    return ye ? i === "patchsrc" ? !0 : i === "for" && l !== "label" && l !== "output" : !1;
  }, Us = function(i) {
    if (!ye)
      return;
    const l = [i];
    for (; l.length > 0; ) {
      const p = l.pop(), f = Y(p);
      if (f === V.processingInstruction || f === V.comment && N(Lr, p.data)) {
        try {
          k(p);
        } catch {
        }
        continue;
      }
      if (f === V.element) {
        const x = p, T = C(Lt(p));
        try {
          x.hasAttribute && x.hasAttribute("patchsrc") && x.removeAttribute("patchsrc"), x.hasAttribute && x.hasAttribute("for") && tr("for", T) && x.removeAttribute("for");
        } catch {
        }
      }
      const b = oe(p);
      if (b)
        for (let x = b.length - 1; x >= 0; --x)
          l.push(b[x]);
    }
  }, nr = function(i) {
    let l = null, p = null;
    if (Bt)
      i = "<remove></remove>" + i;
    else {
      const x = Ar(i, /^[\r\n\t ]+/);
      p = x && x[0];
    }
    Ge === "application/xhtml+xml" && Le === se && (i = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + i + "</body></html>");
    const f = j ? Ie(i) : i;
    if (Le === se)
      try {
        l = new d().parseFromString(f, Ge);
      } catch {
      }
    if (!l || !l.documentElement) {
      l = Mt.createDocument(Le, "template", null);
      try {
        l.documentElement.innerHTML = jt ? be : f;
      } catch {
      }
    }
    const b = l.body || l.documentElement;
    return i && p && b.insertBefore(n.createTextNode(p), b.childNodes[0] || null), Le === se ? _s.call(l, xe ? "html" : "body")[0] : xe ? l.documentElement : b;
  }, rr = function(i) {
    const l = ue ? ue(i) : i.ownerDocument;
    return Ln.call(
      l || i,
      i,
      // eslint-disable-next-line no-bitwise
      c.SHOW_ELEMENT | c.SHOW_COMMENT | c.SHOW_TEXT | c.SHOW_PROCESSING_INSTRUCTION | c.SHOW_CDATA_SECTION,
      null
    );
  }, yt = function(i) {
    return i = Ye(i, ks, " "), i = Ye(i, vs, " "), i = Ye(i, As, " "), i;
  }, Xt = function(i) {
    var l;
    i.normalize();
    const p = ue ? ue(i) : i.ownerDocument, f = Ln.call(
      p || i,
      i,
      // eslint-disable-next-line no-bitwise
      c.SHOW_TEXT | c.SHOW_COMMENT | c.SHOW_CDATA_SECTION | c.SHOW_PROCESSING_INSTRUCTION,
      null
    );
    let b = f.nextNode();
    for (; b; )
      b.data = yt(b.data), b = f.nextNode();
    const x = (l = i.querySelectorAll) === null || l === void 0 ? void 0 : l.call(i, "template");
    x && ve(x, (T) => {
      Me(T.content) && Xt(T.content);
    });
  }, xt = function(i) {
    const l = ce ? ce(i) : null;
    return typeof l != "string" || C(l) !== "form" ? !1 : typeof i.nodeName != "string" || typeof i.textContent != "string" || typeof i.removeChild != "function" || // Realm-safe NamedNodeMap detection: equality against the cached
    // prototype getter. Clobbered .attributes (e.g. <input name="attributes">)
    // makes the direct read diverge from the cached read; a clean form
    // (same-realm OR foreign-realm) has both reads pointing at the same
    // canonical NamedNodeMap.
    i.attributes !== Re(i) || typeof i.removeAttribute != "function" || typeof i.setAttribute != "function" || typeof i.namespaceURI != "string" || typeof i.insertBefore != "function" || typeof i.hasChildNodes != "function" || // NodeType clobbering probe. Cached Node.prototype.nodeType getter
    // returns the integer 1 for any Element regardless of realm; direct
    // read on a clobbered form (e.g. <input name="nodeType">) returns
    // the named child element. Cheap addition — nodeType is read from
    // an internal slot, no serialization cost — and removes a residual
    // clobbering surface used by several mXSS / PI / comment branches
    // in _sanitizeElements that compare currentNode.nodeType directly.
    i.nodeType !== ne(i) || // HTMLFormElement has [LegacyOverrideBuiltIns]: a descendant named
    // "childNodes" shadows the prototype getter. Direct reads of
    // form.childNodes from a clobbered form return the named child
    // instead of the real NodeList, so any walk that reads it directly
    // skips the form's real children. Compare the direct read to the
    // cached Node.prototype getter — when the form's named-property
    // getter intercepts the read, the two values differ and we flag
    // the form. This catches every clobbering child type (input,
    // select, etc.) regardless of whether the named child happens to
    // carry a numeric .length, which a typeof-based probe would miss
    // (e.g. HTMLSelectElement.length is a defined unsigned-long).
    i.childNodes !== oe(i);
  }, Me = function(i) {
    if (!ne || typeof i != "object" || i === null)
      return !1;
    try {
      return ne(i) === V.documentFragment;
    } catch {
      return !1;
    }
  }, Ze = function(i) {
    if (!ne || typeof i != "object" || i === null)
      return !1;
    try {
      return typeof ne(i) == "number";
    } catch {
      return !1;
    }
  };
  function ie(h, i, l) {
    h.length !== 0 && ve(h, (p) => {
      p.call(e, i, l, De);
    });
  }
  const Hs = function(i, l) {
    return !!(ye && i.hasChildNodes() && !Ze(i.firstElementChild) && N(Pr, i.textContent) && N(Pr, i.innerHTML) || ye && i.namespaceURI === se && Wi[l] && (Ze(i.firstElementChild) || typeof i.textContent == "string" && N(Gi[l], i.textContent)) || i.nodeType === V.processingInstruction || ye && i.nodeType === V.comment && N(Lr, i.data));
  }, _t = function(i, l) {
    if (i instanceof RegExp)
      return N(i, l);
    if (i instanceof Function) {
      for (var p = arguments.length, f = new Array(p > 2 ? p - 2 : 0), b = 2; b < p; b++)
        f[b - 2] = arguments[b];
      return !!i(l, ...f);
    }
    return !1;
  }, Bs = function(i, l, p) {
    if (!We[l] && lr(l) && _t(re.tagNameCheck, l))
      return !1;
    if (Ft && !Pe[l]) {
      const f = te(i), b = oe(i);
      if (b && f) {
        const x = b.length;
        for (let T = x - 1; T >= 0; --T) {
          const I = i === p ? A(b[T], !0) : b[T];
          f.insertBefore(I, q(i));
        }
      }
    }
    return de(i), !0;
  }, sr = function(i, l, p, f) {
    return i.length === 0 ? l : l === p || l === f ? X(l) : l;
  }, ir = function(i, l) {
    return i === l || te(i) !== null ? !1 : (qt && bt(i), !0);
  }, ar = function(i, l) {
    if (ie(E.beforeSanitizeElements, i, null), ir(i, l))
      return !0;
    if (xt(i))
      return de(i), !0;
    const p = C(Lt(i));
    if ($ = sr(E.uponSanitizeElement, $, Nt, ut), ie(E.uponSanitizeElement, i, {
      tagName: p,
      allowedTags: $
    }), ir(i, l))
      return !0;
    if (Hs(i, p))
      return de(i), !0;
    if (We[p] || !(pe.tagCheck instanceof Function && pe.tagCheck(p)) && !$[p]) {
      const b = Bs(i, p, l);
      return b === !1 && ie(E.afterSanitizeElements, i, null), b;
    }
    if (Y(i) === V.element && !Ns(i) || (p === "noscript" || p === "noembed" || p === "noframes") && N(qi, i.innerHTML))
      return de(i), !0;
    if (he && i.nodeType === V.text) {
      const b = yt(i.textContent);
      i.textContent !== b && (Xe(e.removed, {
        element: i.cloneNode()
      }), i.textContent = b);
    }
    return ie(E.afterSanitizeElements, i, null), !1;
  }, or = function(i, l, p) {
    if (Nn[l] || tr(l, i) || Bn && (l === "id" || l === "name") && (p in n || p in Ps))
      return !1;
    const f = R[l] || pe.attributeCheck instanceof Function && pe.attributeCheck(l, i);
    return Ut && N(Ts, l) || zn && N(Ss, l) ? !0 : f ? Zn[l] || N(Mn, Ye(p, Dn, "")) || (l === "src" || l === "xlink:href" || l === "href") && i !== "script" && Tr(p, "data:") === 0 && Wn[i] || Un && !N(Es, Ye(p, Dn, "")) ? !0 : !p : (
      // Condition a) covers a basically valid custom element tag name whose
      // tag passes the configured tagNameCheck and whose attribute name
      // passes the configured attributeNameCheck ...
      lr(i) && _t(re.tagNameCheck, i) && _t(re.attributeNameCheck, l, i) || // Condition b) covers an `is` attribute whose value passes the
      // configured tagNameCheck while customized built-in elements are
      // allowed.
      l === "is" && re.allowCustomizedBuiltInElements && _t(re.tagNameCheck, p)
    );
  }, Fs = _({}, ["annotation-xml", "color-profile", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "missing-glyph"]), lr = function(i) {
    return !Fs[et(i)] && N($s, i);
  }, qs = function(i, l, p, f) {
    if (j && typeof m == "object" && typeof m.getAttributeType == "function" && !p)
      switch (m.getAttributeType(i, l)) {
        case "TrustedHTML":
          return Ie(f);
        case "TrustedScriptURL":
          return bs(f);
      }
    return f;
  }, js = function(i, l, p, f) {
    try {
      p ? i.setAttributeNS(p, l, f) : i.setAttribute(l, f), xt(i) ? de(i) : vr(e.removed);
    } catch {
      _e(l, i);
    }
  }, cr = function(i) {
    ie(E.beforeSanitizeAttributes, i, null);
    const l = i.attributes;
    if (!l || xt(i))
      return;
    R = sr(E.uponSanitizeAttribute, R, zt, pt);
    const p = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: R,
      forceKeepAttr: void 0
    };
    let f = l.length;
    const b = C(i.nodeName);
    for (; f--; ) {
      const x = l[f], T = x.name, I = x.namespaceURI, W = x.value, G = C(T), Kt = W;
      let z = T === "value" ? Kt : Ti(Kt);
      if (p.attrName = G, p.attrValue = z, p.keepAttr = !0, p.forceKeepAttr = void 0, ie(E.uponSanitizeAttribute, i, p), z = p.attrValue, Fn && (G === "id" || G === "name") && Tr(z, qn) !== 0 && (_e(T, i, x), z = qn + z), ye && N(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, z)) {
        _e(T, i, x);
        continue;
      }
      if (G === "attributename" && Ar(z, "href")) {
        _e(T, i, x);
        continue;
      }
      if (!p.forceKeepAttr) {
        if (!p.keepAttr) {
          _e(T, i, x);
          continue;
        }
        if (!Hn && N(ji, z)) {
          _e(T, i, x);
          continue;
        }
        if (he && (z = yt(z)), !or(b, G, z)) {
          _e(T, i, x);
          continue;
        }
        z = qs(b, G, I, z), z !== Kt && js(i, T, I, z);
      }
    }
    ie(E.afterSanitizeAttributes, i, null);
  }, wt = function(i) {
    let l = null;
    const p = rr(i);
    for (ie(E.beforeSanitizeShadowDOM, i, null); l = p.nextNode(); )
      if (ie(E.uponSanitizeShadowNode, l, null), ar(l, i), cr(l), Me(l.content) && wt(l.content), Y(l) === V.element) {
        const f = qe(l);
        Me(f) && (Yt(f), wt(f));
      }
    ie(E.afterSanitizeShadowDOM, i, null);
  }, Yt = function(i) {
    const l = [{
      node: i,
      shadow: null
    }];
    for (; l.length > 0; ) {
      const p = l.pop();
      if (p.shadow) {
        wt(p.shadow);
        continue;
      }
      const f = p.node, x = Y(f) === V.element, T = oe(f);
      if (T)
        for (let I = T.length - 1; I >= 0; --I)
          l.push({
            node: T[I],
            shadow: null
          });
      if (x) {
        const I = ce ? ce(f) : null;
        if (typeof I == "string" && C(I) === "template") {
          const W = f.content;
          Me(W) && l.push({
            node: W,
            shadow: null
          });
        }
      }
      if (x) {
        const I = qe(f);
        Me(I) && l.push({
          node: null,
          shadow: I
        }, {
          node: I,
          shadow: null
        });
      }
    }
  };
  return e.sanitize = function(h) {
    let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, l = null, p = null, f = null, b = null;
    if (jt = !h, jt && (h = "<!-->"), typeof h != "string" && !Ze(h) && (h = Ii(h), typeof h != "string"))
      throw ke("dirty is not a string, aborting");
    if (!e.isSupported)
      return h;
    Ht ? ($ = ut, R = pt) : Vt(i), (E.uponSanitizeElement.length > 0 || E.uponSanitizeAttribute.length > 0) && ($ = X($)), E.uponSanitizeAttribute.length > 0 && (R = X(R)), e.removed = [];
    const x = qt && typeof h != "string" && Ze(h);
    if (x) {
      Us(h);
      const W = Lt(h);
      if (typeof W == "string") {
        const G = C(W);
        if (!$[G] || We[G])
          throw mt(h), ke("root node is forbidden and cannot be sanitized in-place");
      }
      if (xt(h))
        throw mt(h), ke("root node is clobbered and cannot be sanitized in-place");
      try {
        Yt(h);
      } catch (G) {
        throw mt(h), G;
      }
    } else if (Ze(h))
      l = nr("<!---->"), p = l.ownerDocument.importNode(h, !0), p.nodeType === V.element && p.nodeName === "BODY" || p.nodeName === "HTML" ? l = p : l.appendChild(p), Yt(p);
    else {
      if (!Ce && !he && !xe && // eslint-disable-next-line unicorn/prefer-includes
      h.indexOf("<") === -1)
        return j && dt ? Ie(h) : h;
      if (l = nr(h), !l)
        return Ce ? null : dt ? be : "";
    }
    l && Bt && de(l.firstChild);
    const T = x ? h : l;
    try {
      const W = rr(T);
      for (; f = W.nextNode(); )
        ar(f, T), cr(f), Me(f.content) && wt(f.content);
    } catch (W) {
      throw x && (mt(h), ve(e.removed, (G) => {
        G.element && bt(G.element);
      })), W;
    }
    if (x)
      return ve(e.removed, (W) => {
        W.element && bt(W.element);
      }), he && Xt(h), h;
    if (Ce) {
      if (he && Xt(l), ht)
        for (b = xs.call(l.ownerDocument); l.firstChild; )
          b.appendChild(l.firstChild);
      else
        b = l;
      return (R.shadowroot || R.shadowrootmode) && (b = ws.call(s, b, !0)), b;
    }
    let I = xe ? l.outerHTML : l.innerHTML;
    return xe && $["!doctype"] && l.ownerDocument && l.ownerDocument.doctype && l.ownerDocument.doctype.name && N(Bi, l.ownerDocument.doctype.name) && (I = "<!DOCTYPE " + l.ownerDocument.doctype.name + `>
` + I), he && (I = yt(I)), j && dt ? Ie(I) : I;
  }, e.setConfig = function() {
    let h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Vt(h), Ht = !0, ut = $, pt = R;
  }, e.clearConfig = function() {
    De = null, Ht = !1, ut = null, pt = null, j = Dt, be = "";
  }, e.isValidAttribute = function(h, i, l) {
    De || Vt({});
    const p = C(h), f = C(i);
    return or(p, f, l);
  }, e.addHook = function(h, i) {
    typeof i == "function" && Z(E, h) && Xe(E[h], i);
  }, e.removeHook = function(h, i) {
    if (Z(E, h)) {
      if (i !== void 0) {
        const l = vi(E[h], i);
        return l === -1 ? void 0 : Ai(E[h], l, 1)[0];
      }
      return vr(E[h]);
    }
  }, e.removeHooks = function(h) {
    Z(E, h) && (E[h] = []);
  }, e.removeAllHooks = function() {
    E = Dr();
  }, e;
}
var Xi = es();
function wn() {
  return { async: !1, breaks: !1, extensions: null, gfm: !0, hooks: null, pedantic: !1, renderer: null, silent: !1, tokenizer: null, walkTokens: null };
}
var $e = wn();
function ts(t) {
  $e = t;
}
var rt = { exec: () => null };
function w(t, e = "") {
  let n = typeof t == "string" ? t : t.source, s = { replace: (r, o) => {
    let a = typeof o == "string" ? o : o.source;
    return a = a.replace(H.caret, "$1"), n = n.replace(r, a), s;
  }, getRegex: () => new RegExp(n, e) };
  return s;
}
var Yi = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return !1;
  }
})(), H = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (t) => new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}#`), htmlBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}<(?:[a-z].*>|!--)`, "i") }, Ki = /^(?:[ \t]*(?:\n|$))+/, Qi = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, Ji = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, lt = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, ea = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, kn = /(?:[*+-]|\d{1,9}[.)])/, ns = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, rs = w(ns).replace(/bull/g, kn).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), ta = w(ns).replace(/bull/g, kn).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), vn = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, na = /^[^\n]+/, An = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, ra = w(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", An).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), sa = w(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, kn).getRegex(), Ot = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", Tn = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, ia = w("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", Tn).replace("tag", Ot).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), ss = w(vn).replace("hr", lt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex(), aa = w(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ss).getRegex(), Sn = { blockquote: aa, code: Qi, def: ra, fences: Ji, heading: ea, hr: lt, html: ia, lheading: rs, list: sa, newline: Ki, paragraph: ss, table: rt, text: na }, Mr = w("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", lt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex(), oa = { ...Sn, lheading: ta, table: Mr, paragraph: w(vn).replace("hr", lt).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", Mr).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex() }, la = { ...Sn, html: w(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", Tn).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: rt, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: w(vn).replace("hr", lt).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", rs).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, ca = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, ua = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, is = /^( {2,}|\\)\n(?!\s*$)/, pa = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, Pt = /[\p{P}\p{S}]/u, En = /[\s\p{P}\p{S}]/u, as = /[^\s\p{P}\p{S}]/u, ha = w(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, En).getRegex(), os = /(?!~)[\p{P}\p{S}]/u, da = /(?!~)[\s\p{P}\p{S}]/u, fa = /(?:[^\s\p{P}\p{S}]|~)/u, ga = w(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Yi ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), ls = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, ma = w(ls, "u").replace(/punct/g, Pt).getRegex(), ba = w(ls, "u").replace(/punct/g, os).getRegex(), cs = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", ya = w(cs, "gu").replace(/notPunctSpace/g, as).replace(/punctSpace/g, En).replace(/punct/g, Pt).getRegex(), xa = w(cs, "gu").replace(/notPunctSpace/g, fa).replace(/punctSpace/g, da).replace(/punct/g, os).getRegex(), _a = w("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, as).replace(/punctSpace/g, En).replace(/punct/g, Pt).getRegex(), wa = w(/\\(punct)/, "gu").replace(/punct/g, Pt).getRegex(), ka = w(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), va = w(Tn).replace("(?:-->|$)", "-->").getRegex(), Aa = w("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", va).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), Et = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/, Ta = w(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", Et).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), us = w(/^!?\[(label)\]\[(ref)\]/).replace("label", Et).replace("ref", An).getRegex(), ps = w(/^!?\[(ref)\](?:\[\])?/).replace("ref", An).getRegex(), Sa = w("reflink|nolink(?!\\()", "g").replace("reflink", us).replace("nolink", ps).getRegex(), Nr = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, $n = { _backpedal: rt, anyPunctuation: wa, autolink: ka, blockSkip: ga, br: is, code: ua, del: rt, emStrongLDelim: ma, emStrongRDelimAst: ya, emStrongRDelimUnd: _a, escape: ca, link: Ta, nolink: ps, punctuation: ha, reflink: us, reflinkSearch: Sa, tag: Aa, text: pa, url: rt }, Ea = { ...$n, link: w(/^!?\[(label)\]\((.*?)\)/).replace("label", Et).getRegex(), reflink: w(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", Et).getRegex() }, cn = { ...$n, emStrongRDelimAst: xa, emStrongLDelim: ba, url: w(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", Nr).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: w(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", Nr).getRegex() }, $a = { ...cn, br: w(is).replace("{2,}", "*").getRegex(), text: w(cn.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, vt = { normal: Sn, gfm: oa, pedantic: la }, Qe = { normal: $n, gfm: cn, breaks: $a, pedantic: Ea }, Ra = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, zr = (t) => Ra[t];
function ae(t, e) {
  if (e) {
    if (H.escapeTest.test(t)) return t.replace(H.escapeReplace, zr);
  } else if (H.escapeTestNoEncode.test(t)) return t.replace(H.escapeReplaceNoEncode, zr);
  return t;
}
function Ur(t) {
  try {
    t = encodeURI(t).replace(H.percentDecode, "%");
  } catch {
    return null;
  }
  return t;
}
function Hr(t, e) {
  let n = t.replace(H.findPipe, (o, a, u) => {
    let c = !1, g = a;
    for (; --g >= 0 && u[g] === "\\"; ) c = !c;
    return c ? "|" : " |";
  }), s = n.split(H.splitPipe), r = 0;
  if (s[0].trim() || s.shift(), s.length > 0 && !s.at(-1)?.trim() && s.pop(), e) if (s.length > e) s.splice(e);
  else for (; s.length < e; ) s.push("");
  for (; r < s.length; r++) s[r] = s[r].trim().replace(H.slashPipe, "|");
  return s;
}
function Je(t, e, n) {
  let s = t.length;
  if (s === 0) return "";
  let r = 0;
  for (; r < s && t.charAt(s - r - 1) === e; )
    r++;
  return t.slice(0, s - r);
}
function Ia(t, e) {
  if (t.indexOf(e[1]) === -1) return -1;
  let n = 0;
  for (let s = 0; s < t.length; s++) if (t[s] === "\\") s++;
  else if (t[s] === e[0]) n++;
  else if (t[s] === e[1] && (n--, n < 0)) return s;
  return n > 0 ? -2 : -1;
}
function Br(t, e, n, s, r) {
  let o = e.href, a = e.title || null, u = t[1].replace(r.other.outputLinkReplace, "$1");
  s.state.inLink = !0;
  let c = { type: t[0].charAt(0) === "!" ? "image" : "link", raw: n, href: o, title: a, text: u, tokens: s.inlineTokens(u) };
  return s.state.inLink = !1, c;
}
function Ca(t, e, n) {
  let s = t.match(n.other.indentCodeCompensation);
  if (s === null) return e;
  let r = s[1];
  return e.split(`
`).map((o) => {
    let a = o.match(n.other.beginningSpace);
    if (a === null) return o;
    let [u] = a;
    return u.length >= r.length ? o.slice(r.length) : o;
  }).join(`
`);
}
var $t = class {
  options;
  rules;
  lexer;
  constructor(t) {
    this.options = t || $e;
  }
  space(t) {
    let e = this.rules.block.newline.exec(t);
    if (e && e[0].length > 0) return { type: "space", raw: e[0] };
  }
  code(t) {
    let e = this.rules.block.code.exec(t);
    if (e) {
      let n = e[0].replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: e[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : Je(n, `
`) };
    }
  }
  fences(t) {
    let e = this.rules.block.fences.exec(t);
    if (e) {
      let n = e[0], s = Ca(n, e[3] || "", this.rules);
      return { type: "code", raw: n, lang: e[2] ? e[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : e[2], text: s };
    }
  }
  heading(t) {
    let e = this.rules.block.heading.exec(t);
    if (e) {
      let n = e[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = Je(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: e[0], depth: e[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(t) {
    let e = this.rules.block.hr.exec(t);
    if (e) return { type: "hr", raw: Je(e[0], `
`) };
  }
  blockquote(t) {
    let e = this.rules.block.blockquote.exec(t);
    if (e) {
      let n = Je(e[0], `
`).split(`
`), s = "", r = "", o = [];
      for (; n.length > 0; ) {
        let a = !1, u = [], c;
        for (c = 0; c < n.length; c++) if (this.rules.other.blockquoteStart.test(n[c])) u.push(n[c]), a = !0;
        else if (!a) u.push(n[c]);
        else break;
        n = n.slice(c);
        let g = u.join(`
`), d = g.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${g}` : g, r = r ? `${r}
${d}` : d;
        let m = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(d, o, !0), this.lexer.state.top = m, n.length === 0) break;
        let y = o.at(-1);
        if (y?.type === "code") break;
        if (y?.type === "blockquote") {
          let A = y, k = A.raw + `
` + n.join(`
`), q = this.blockquote(k);
          o[o.length - 1] = q, s = s.substring(0, s.length - A.raw.length) + q.raw, r = r.substring(0, r.length - A.text.length) + q.text;
          break;
        } else if (y?.type === "list") {
          let A = y, k = A.raw + `
` + n.join(`
`), q = this.list(k);
          o[o.length - 1] = q, s = s.substring(0, s.length - y.raw.length) + q.raw, r = r.substring(0, r.length - A.raw.length) + q.raw, n = k.substring(o.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: o, text: r };
    }
  }
  list(t) {
    let e = this.rules.block.list.exec(t);
    if (e) {
      let n = e[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: !1, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let o = this.rules.other.listItemRegex(n), a = !1;
      for (; t; ) {
        let c = !1, g = "", d = "";
        if (!(e = o.exec(t)) || this.rules.block.hr.test(t)) break;
        g = e[0], t = t.substring(g.length);
        let m = e[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (te) => " ".repeat(3 * te.length)), y = t.split(`
`, 1)[0], A = !m.trim(), k = 0;
        if (this.options.pedantic ? (k = 2, d = m.trimStart()) : A ? k = e[1].length + 1 : (k = e[2].search(this.rules.other.nonSpaceChar), k = k > 4 ? 1 : k, d = m.slice(k), k += e[1].length), A && this.rules.other.blankLine.test(y) && (g += y + `
`, t = t.substring(y.length + 1), c = !0), !c) {
          let te = this.rules.other.nextBulletRegex(k), qe = this.rules.other.hrRegex(k), Re = this.rules.other.fencesBeginRegex(k), ne = this.rules.other.headingBeginRegex(k), ce = this.rules.other.htmlBeginRegex(k);
          for (; t; ) {
            let ue = t.split(`
`, 1)[0], Y;
            if (y = ue, this.options.pedantic ? (y = y.replace(this.rules.other.listReplaceNesting, "  "), Y = y) : Y = y.replace(this.rules.other.tabCharGlobal, "    "), Re.test(y) || ne.test(y) || ce.test(y) || te.test(y) || qe.test(y)) break;
            if (Y.search(this.rules.other.nonSpaceChar) >= k || !y.trim()) d += `
` + Y.slice(k);
            else {
              if (A || m.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Re.test(m) || ne.test(m) || qe.test(m)) break;
              d += `
` + y;
            }
            !A && !y.trim() && (A = !0), g += ue + `
`, t = t.substring(ue.length + 1), m = Y.slice(k);
          }
        }
        r.loose || (a ? r.loose = !0 : this.rules.other.doubleBlankLine.test(g) && (a = !0));
        let q = null, oe;
        this.options.gfm && (q = this.rules.other.listIsTask.exec(d), q && (oe = q[0] !== "[ ] ", d = d.replace(this.rules.other.listReplaceTask, ""))), r.items.push({ type: "list_item", raw: g, task: !!q, checked: oe, loose: !1, text: d, tokens: [] }), r.raw += g;
      }
      let u = r.items.at(-1);
      if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else return;
      r.raw = r.raw.trimEnd();
      for (let c = 0; c < r.items.length; c++) if (this.lexer.state.top = !1, r.items[c].tokens = this.lexer.blockTokens(r.items[c].text, []), !r.loose) {
        let g = r.items[c].tokens.filter((m) => m.type === "space"), d = g.length > 0 && g.some((m) => this.rules.other.anyLine.test(m.raw));
        r.loose = d;
      }
      if (r.loose) for (let c = 0; c < r.items.length; c++) r.items[c].loose = !0;
      return r;
    }
  }
  html(t) {
    let e = this.rules.block.html.exec(t);
    if (e) return { type: "html", block: !0, raw: e[0], pre: e[1] === "pre" || e[1] === "script" || e[1] === "style", text: e[0] };
  }
  def(t) {
    let e = this.rules.block.def.exec(t);
    if (e) {
      let n = e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), s = e[2] ? e[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = e[3] ? e[3].substring(1, e[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : e[3];
      return { type: "def", tag: n, raw: e[0], href: s, title: r };
    }
  }
  table(t) {
    let e = this.rules.block.table.exec(t);
    if (!e || !this.rules.other.tableDelimiter.test(e[2])) return;
    let n = Hr(e[1]), s = e[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = e[3]?.trim() ? e[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: e[0], header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let a of s) this.rules.other.tableAlignRight.test(a) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? o.align.push("left") : o.align.push(null);
      for (let a = 0; a < n.length; a++) o.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: !0, align: o.align[a] });
      for (let a of r) o.rows.push(Hr(a, o.header.length).map((u, c) => ({ text: u, tokens: this.lexer.inline(u), header: !1, align: o.align[c] })));
      return o;
    }
  }
  lheading(t) {
    let e = this.rules.block.lheading.exec(t);
    if (e) return { type: "heading", raw: e[0], depth: e[2].charAt(0) === "=" ? 1 : 2, text: e[1], tokens: this.lexer.inline(e[1]) };
  }
  paragraph(t) {
    let e = this.rules.block.paragraph.exec(t);
    if (e) {
      let n = e[1].charAt(e[1].length - 1) === `
` ? e[1].slice(0, -1) : e[1];
      return { type: "paragraph", raw: e[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(t) {
    let e = this.rules.block.text.exec(t);
    if (e) return { type: "text", raw: e[0], text: e[0], tokens: this.lexer.inline(e[0]) };
  }
  escape(t) {
    let e = this.rules.inline.escape.exec(t);
    if (e) return { type: "escape", raw: e[0], text: e[1] };
  }
  tag(t) {
    let e = this.rules.inline.tag.exec(t);
    if (e) return !this.lexer.state.inLink && this.rules.other.startATag.test(e[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(e[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(e[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(e[0]) && (this.lexer.state.inRawBlock = !1), { type: "html", raw: e[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: !1, text: e[0] };
  }
  link(t) {
    let e = this.rules.inline.link.exec(t);
    if (e) {
      let n = e[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let o = Je(n.slice(0, -1), "\\");
        if ((n.length - o.length) % 2 === 0) return;
      } else {
        let o = Ia(e[2], "()");
        if (o === -2) return;
        if (o > -1) {
          let a = (e[0].indexOf("!") === 0 ? 5 : 4) + e[1].length + o;
          e[2] = e[2].substring(0, o), e[0] = e[0].substring(0, a).trim(), e[3] = "";
        }
      }
      let s = e[2], r = "";
      if (this.options.pedantic) {
        let o = this.rules.other.pedanticHrefTitle.exec(s);
        o && (s = o[1], r = o[3]);
      } else r = e[3] ? e[3].slice(1, -1) : "";
      return s = s.trim(), this.rules.other.startAngleBracket.test(s) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? s = s.slice(1) : s = s.slice(1, -1)), Br(e, { href: s && s.replace(this.rules.inline.anyPunctuation, "$1"), title: r && r.replace(this.rules.inline.anyPunctuation, "$1") }, e[0], this.lexer, this.rules);
    }
  }
  reflink(t, e) {
    let n;
    if ((n = this.rules.inline.reflink.exec(t)) || (n = this.rules.inline.nolink.exec(t))) {
      let s = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), r = e[s.toLowerCase()];
      if (!r) {
        let o = n[0].charAt(0);
        return { type: "text", raw: o, text: o };
      }
      return Br(n, r, n[0], this.lexer, this.rules);
    }
  }
  emStrong(t, e, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(t);
    if (!(!s || s[3] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(s[1] || s[2]) || !n || this.rules.inline.punctuation.exec(n))) {
      let r = [...s[0]].length - 1, o, a, u = r, c = 0, g = s[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (g.lastIndex = 0, e = e.slice(-1 * t.length + r); (s = g.exec(e)) != null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o) continue;
        if (a = [...o].length, s[3] || s[4]) {
          u += a;
          continue;
        } else if ((s[5] || s[6]) && r % 3 && !((r + a) % 3)) {
          c += a;
          continue;
        }
        if (u -= a, u > 0) continue;
        a = Math.min(a, a + u + c);
        let d = [...s[0]][0].length, m = t.slice(0, r + s.index + d + a);
        if (Math.min(r, a) % 2) {
          let A = m.slice(1, -1);
          return { type: "em", raw: m, text: A, tokens: this.lexer.inlineTokens(A) };
        }
        let y = m.slice(2, -2);
        return { type: "strong", raw: m, text: y, tokens: this.lexer.inlineTokens(y) };
      }
    }
  }
  codespan(t) {
    let e = this.rules.inline.code.exec(t);
    if (e) {
      let n = e[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: e[0], text: n };
    }
  }
  br(t) {
    let e = this.rules.inline.br.exec(t);
    if (e) return { type: "br", raw: e[0] };
  }
  del(t) {
    let e = this.rules.inline.del.exec(t);
    if (e) return { type: "del", raw: e[0], text: e[2], tokens: this.lexer.inlineTokens(e[2]) };
  }
  autolink(t) {
    let e = this.rules.inline.autolink.exec(t);
    if (e) {
      let n, s;
      return e[2] === "@" ? (n = e[1], s = "mailto:" + n) : (n = e[1], s = n), { type: "link", raw: e[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(t) {
    let e;
    if (e = this.rules.inline.url.exec(t)) {
      let n, s;
      if (e[2] === "@") n = e[0], s = "mailto:" + n;
      else {
        let r;
        do
          r = e[0], e[0] = this.rules.inline._backpedal.exec(e[0])?.[0] ?? "";
        while (r !== e[0]);
        n = e[0], e[1] === "www." ? s = "http://" + e[0] : s = e[0];
      }
      return { type: "link", raw: e[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(t) {
    let e = this.rules.inline.text.exec(t);
    if (e) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: e[0], text: e[0], escaped: n };
    }
  }
}, Q = class un {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || $e, this.options.tokenizer = this.options.tokenizer || new $t(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: !1, inRawBlock: !1, top: !0 };
    let n = { other: H, block: vt.normal, inline: Qe.normal };
    this.options.pedantic ? (n.block = vt.pedantic, n.inline = Qe.pedantic) : this.options.gfm && (n.block = vt.gfm, this.options.breaks ? n.inline = Qe.breaks : n.inline = Qe.gfm), this.tokenizer.rules = n;
  }
  static get rules() {
    return { block: vt, inline: Qe };
  }
  static lex(e, n) {
    return new un(n).lex(e);
  }
  static lexInline(e, n) {
    return new un(n).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(H.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let n = 0; n < this.inlineQueue.length; n++) {
      let s = this.inlineQueue[n];
      this.inlineTokens(s.src, s.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, n = [], s = !1) {
    for (this.options.pedantic && (e = e.replace(H.tabCharGlobal, "    ").replace(H.spaceLine, "")); e; ) {
      let r;
      if (this.options.extensions?.block?.some((a) => (r = a.call({ lexer: this }, e, n)) ? (e = e.substring(r.raw.length), n.push(r), !0) : !1)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let a = n.at(-1);
        r.raw.length === 1 && a !== void 0 ? a.raw += `
` : n.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let a = n.at(-1);
        a?.type === "paragraph" || a?.type === "text" ? (a.raw += (a.raw.endsWith(`
`) ? "" : `
`) + r.raw, a.text += `
` + r.text, this.inlineQueue.at(-1).src = a.text) : n.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let a = n.at(-1);
        a?.type === "paragraph" || a?.type === "text" ? (a.raw += (a.raw.endsWith(`
`) ? "" : `
`) + r.raw, a.text += `
` + r.raw, this.inlineQueue.at(-1).src = a.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, n.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), n.push(r);
        continue;
      }
      let o = e;
      if (this.options.extensions?.startBlock) {
        let a = 1 / 0, u = e.slice(1), c;
        this.options.extensions.startBlock.forEach((g) => {
          c = g.call({ lexer: this }, u), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
        }), a < 1 / 0 && a >= 0 && (o = e.substring(0, a + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(o))) {
        let a = n.at(-1);
        s && a?.type === "paragraph" ? (a.raw += (a.raw.endsWith(`
`) ? "" : `
`) + r.raw, a.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = a.text) : n.push(r), s = o.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let a = n.at(-1);
        a?.type === "text" ? (a.raw += (a.raw.endsWith(`
`) ? "" : `
`) + r.raw, a.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = a.text) : n.push(r);
        continue;
      }
      if (e) {
        let a = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(a);
          break;
        } else throw new Error(a);
      }
    }
    return this.state.top = !0, n;
  }
  inline(e, n = []) {
    return this.inlineQueue.push({ src: e, tokens: n }), n;
  }
  inlineTokens(e, n = []) {
    let s = e, r = null;
    if (this.tokens.links) {
      let c = Object.keys(this.tokens.links);
      if (c.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(s)) != null; ) c.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (s = s.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + s.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(s)) != null; ) s = s.slice(0, r.index) + "++" + s.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    let o;
    for (; (r = this.tokenizer.rules.inline.blockSkip.exec(s)) != null; ) o = r[2] ? r[2].length : 0, s = s.slice(0, r.index + o) + "[" + "a".repeat(r[0].length - o - 2) + "]" + s.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    s = this.options.hooks?.emStrongMask?.call({ lexer: this }, s) ?? s;
    let a = !1, u = "";
    for (; e; ) {
      a || (u = ""), a = !1;
      let c;
      if (this.options.extensions?.inline?.some((d) => (c = d.call({ lexer: this }, e, n)) ? (e = e.substring(c.raw.length), n.push(c), !0) : !1)) continue;
      if (c = this.tokenizer.escape(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.tag(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.link(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(c.raw.length);
        let d = n.at(-1);
        c.type === "text" && d?.type === "text" ? (d.raw += c.raw, d.text += c.text) : n.push(c);
        continue;
      }
      if (c = this.tokenizer.emStrong(e, s, u)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.codespan(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.br(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.del(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (c = this.tokenizer.autolink(e)) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      if (!this.state.inLink && (c = this.tokenizer.url(e))) {
        e = e.substring(c.raw.length), n.push(c);
        continue;
      }
      let g = e;
      if (this.options.extensions?.startInline) {
        let d = 1 / 0, m = e.slice(1), y;
        this.options.extensions.startInline.forEach((A) => {
          y = A.call({ lexer: this }, m), typeof y == "number" && y >= 0 && (d = Math.min(d, y));
        }), d < 1 / 0 && d >= 0 && (g = e.substring(0, d + 1));
      }
      if (c = this.tokenizer.inlineText(g)) {
        e = e.substring(c.raw.length), c.raw.slice(-1) !== "_" && (u = c.raw.slice(-1)), a = !0;
        let d = n.at(-1);
        d?.type === "text" ? (d.raw += c.raw, d.text += c.text) : n.push(c);
        continue;
      }
      if (e) {
        let d = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(d);
          break;
        } else throw new Error(d);
      }
    }
    return n;
  }
}, Rt = class {
  options;
  parser;
  constructor(t) {
    this.options = t || $e;
  }
  space(t) {
    return "";
  }
  code({ text: t, lang: e, escaped: n }) {
    let s = (e || "").match(H.notSpaceStart)?.[0], r = t.replace(H.endingNewline, "") + `
`;
    return s ? '<pre><code class="language-' + ae(s) + '">' + (n ? r : ae(r, !0)) + `</code></pre>
` : "<pre><code>" + (n ? r : ae(r, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: t }) {
    return `<blockquote>
${this.parser.parse(t)}</blockquote>
`;
  }
  html({ text: t }) {
    return t;
  }
  def(t) {
    return "";
  }
  heading({ tokens: t, depth: e }) {
    return `<h${e}>${this.parser.parseInline(t)}</h${e}>
`;
  }
  hr(t) {
    return `<hr>
`;
  }
  list(t) {
    let e = t.ordered, n = t.start, s = "";
    for (let a = 0; a < t.items.length; a++) {
      let u = t.items[a];
      s += this.listitem(u);
    }
    let r = e ? "ol" : "ul", o = e && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + o + `>
` + s + "</" + r + `>
`;
  }
  listitem(t) {
    let e = "";
    if (t.task) {
      let n = this.checkbox({ checked: !!t.checked });
      t.loose ? t.tokens[0]?.type === "paragraph" ? (t.tokens[0].text = n + " " + t.tokens[0].text, t.tokens[0].tokens && t.tokens[0].tokens.length > 0 && t.tokens[0].tokens[0].type === "text" && (t.tokens[0].tokens[0].text = n + " " + ae(t.tokens[0].tokens[0].text), t.tokens[0].tokens[0].escaped = !0)) : t.tokens.unshift({ type: "text", raw: n + " ", text: n + " ", escaped: !0 }) : e += n + " ";
    }
    return e += this.parser.parse(t.tokens, !!t.loose), `<li>${e}</li>
`;
  }
  checkbox({ checked: t }) {
    return "<input " + (t ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: t }) {
    return `<p>${this.parser.parseInline(t)}</p>
`;
  }
  table(t) {
    let e = "", n = "";
    for (let r = 0; r < t.header.length; r++) n += this.tablecell(t.header[r]);
    e += this.tablerow({ text: n });
    let s = "";
    for (let r = 0; r < t.rows.length; r++) {
      let o = t.rows[r];
      n = "";
      for (let a = 0; a < o.length; a++) n += this.tablecell(o[a]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + e + `</thead>
` + s + `</table>
`;
  }
  tablerow({ text: t }) {
    return `<tr>
${t}</tr>
`;
  }
  tablecell(t) {
    let e = this.parser.parseInline(t.tokens), n = t.header ? "th" : "td";
    return (t.align ? `<${n} align="${t.align}">` : `<${n}>`) + e + `</${n}>
`;
  }
  strong({ tokens: t }) {
    return `<strong>${this.parser.parseInline(t)}</strong>`;
  }
  em({ tokens: t }) {
    return `<em>${this.parser.parseInline(t)}</em>`;
  }
  codespan({ text: t }) {
    return `<code>${ae(t, !0)}</code>`;
  }
  br(t) {
    return "<br>";
  }
  del({ tokens: t }) {
    return `<del>${this.parser.parseInline(t)}</del>`;
  }
  link({ href: t, title: e, tokens: n }) {
    let s = this.parser.parseInline(n), r = Ur(t);
    if (r === null) return s;
    t = r;
    let o = '<a href="' + t + '"';
    return e && (o += ' title="' + ae(e) + '"'), o += ">" + s + "</a>", o;
  }
  image({ href: t, title: e, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = Ur(t);
    if (r === null) return ae(n);
    t = r;
    let o = `<img src="${t}" alt="${n}"`;
    return e && (o += ` title="${ae(e)}"`), o += ">", o;
  }
  text(t) {
    return "tokens" in t && t.tokens ? this.parser.parseInline(t.tokens) : "escaped" in t && t.escaped ? t.text : ae(t.text);
  }
}, Rn = class {
  strong({ text: t }) {
    return t;
  }
  em({ text: t }) {
    return t;
  }
  codespan({ text: t }) {
    return t;
  }
  del({ text: t }) {
    return t;
  }
  html({ text: t }) {
    return t;
  }
  text({ text: t }) {
    return t;
  }
  link({ text: t }) {
    return "" + t;
  }
  image({ text: t }) {
    return "" + t;
  }
  br() {
    return "";
  }
}, J = class pn {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || $e, this.options.renderer = this.options.renderer || new Rt(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new Rn();
  }
  static parse(e, n) {
    return new pn(n).parse(e);
  }
  static parseInline(e, n) {
    return new pn(n).parseInline(e);
  }
  parse(e, n = !0) {
    let s = "";
    for (let r = 0; r < e.length; r++) {
      let o = e[r];
      if (this.options.extensions?.renderers?.[o.type]) {
        let u = o, c = this.options.extensions.renderers[u.type].call({ parser: this }, u);
        if (c !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(u.type)) {
          s += c || "";
          continue;
        }
      }
      let a = o;
      switch (a.type) {
        case "space": {
          s += this.renderer.space(a);
          continue;
        }
        case "hr": {
          s += this.renderer.hr(a);
          continue;
        }
        case "heading": {
          s += this.renderer.heading(a);
          continue;
        }
        case "code": {
          s += this.renderer.code(a);
          continue;
        }
        case "table": {
          s += this.renderer.table(a);
          continue;
        }
        case "blockquote": {
          s += this.renderer.blockquote(a);
          continue;
        }
        case "list": {
          s += this.renderer.list(a);
          continue;
        }
        case "html": {
          s += this.renderer.html(a);
          continue;
        }
        case "def": {
          s += this.renderer.def(a);
          continue;
        }
        case "paragraph": {
          s += this.renderer.paragraph(a);
          continue;
        }
        case "text": {
          let u = a, c = this.renderer.text(u);
          for (; r + 1 < e.length && e[r + 1].type === "text"; ) u = e[++r], c += `
` + this.renderer.text(u);
          n ? s += this.renderer.paragraph({ type: "paragraph", raw: c, text: c, tokens: [{ type: "text", raw: c, text: c, escaped: !0 }] }) : s += c;
          continue;
        }
        default: {
          let u = 'Token with "' + a.type + '" type was not found.';
          if (this.options.silent) return console.error(u), "";
          throw new Error(u);
        }
      }
    }
    return s;
  }
  parseInline(e, n = this.renderer) {
    let s = "";
    for (let r = 0; r < e.length; r++) {
      let o = e[r];
      if (this.options.extensions?.renderers?.[o.type]) {
        let u = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (u !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(o.type)) {
          s += u || "";
          continue;
        }
      }
      let a = o;
      switch (a.type) {
        case "escape": {
          s += n.text(a);
          break;
        }
        case "html": {
          s += n.html(a);
          break;
        }
        case "link": {
          s += n.link(a);
          break;
        }
        case "image": {
          s += n.image(a);
          break;
        }
        case "strong": {
          s += n.strong(a);
          break;
        }
        case "em": {
          s += n.em(a);
          break;
        }
        case "codespan": {
          s += n.codespan(a);
          break;
        }
        case "br": {
          s += n.br(a);
          break;
        }
        case "del": {
          s += n.del(a);
          break;
        }
        case "text": {
          s += n.text(a);
          break;
        }
        default: {
          let u = 'Token with "' + a.type + '" type was not found.';
          if (this.options.silent) return console.error(u), "";
          throw new Error(u);
        }
      }
    }
    return s;
  }
}, tt = class {
  options;
  block;
  constructor(t) {
    this.options = t || $e;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(t) {
    return t;
  }
  postprocess(t) {
    return t;
  }
  processAllTokens(t) {
    return t;
  }
  emStrongMask(t) {
    return t;
  }
  provideLexer() {
    return this.block ? Q.lex : Q.lexInline;
  }
  provideParser() {
    return this.block ? J.parse : J.parseInline;
  }
}, Oa = class {
  defaults = wn();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = J;
  Renderer = Rt;
  TextRenderer = Rn;
  Lexer = Q;
  Tokenizer = $t;
  Hooks = tt;
  constructor(...t) {
    this.use(...t);
  }
  walkTokens(t, e) {
    let n = [];
    for (let s of t) switch (n = n.concat(e.call(this, s)), s.type) {
      case "table": {
        let r = s;
        for (let o of r.header) n = n.concat(this.walkTokens(o.tokens, e));
        for (let o of r.rows) for (let a of o) n = n.concat(this.walkTokens(a.tokens, e));
        break;
      }
      case "list": {
        let r = s;
        n = n.concat(this.walkTokens(r.items, e));
        break;
      }
      default: {
        let r = s;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
          let a = r[o].flat(1 / 0);
          n = n.concat(this.walkTokens(a, e));
        }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, e)));
      }
    }
    return n;
  }
  use(...t) {
    let e = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return t.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || !1, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let o = e.renderers[r.name];
          o ? e.renderers[r.name] = function(...a) {
            let u = r.renderer.apply(this, a);
            return u === !1 && (u = o.apply(this, a)), u;
          } : e.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let o = e[r.level];
          o ? o.unshift(r.tokenizer) : e[r.level] = [r.tokenizer], r.start && (r.level === "block" ? e.startBlock ? e.startBlock.push(r.start) : e.startBlock = [r.start] : r.level === "inline" && (e.startInline ? e.startInline.push(r.start) : e.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (e.childTokens[r.name] = r.childTokens);
      }), s.extensions = e), n.renderer) {
        let r = this.defaults.renderer || new Rt(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o)) continue;
          let a = o, u = n.renderer[a], c = r[a];
          r[a] = (...g) => {
            let d = u.apply(r, g);
            return d === !1 && (d = c.apply(r, g)), d || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new $t(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o)) continue;
          let a = o, u = n.tokenizer[a], c = r[a];
          r[a] = (...g) => {
            let d = u.apply(r, g);
            return d === !1 && (d = c.apply(r, g)), d;
          };
        }
        s.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new tt();
        for (let o in n.hooks) {
          if (!(o in r)) throw new Error(`hook '${o}' does not exist`);
          if (["options", "block"].includes(o)) continue;
          let a = o, u = n.hooks[a], c = r[a];
          tt.passThroughHooks.has(o) ? r[a] = (g) => {
            if (this.defaults.async && tt.passThroughHooksRespectAsync.has(o)) return (async () => {
              let m = await u.call(r, g);
              return c.call(r, m);
            })();
            let d = u.call(r, g);
            return c.call(r, d);
          } : r[a] = (...g) => {
            if (this.defaults.async) return (async () => {
              let m = await u.apply(r, g);
              return m === !1 && (m = await c.apply(r, g)), m;
            })();
            let d = u.apply(r, g);
            return d === !1 && (d = c.apply(r, g)), d;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        s.walkTokens = function(a) {
          let u = [];
          return u.push(o.call(this, a)), r && (u = u.concat(r.call(this, a))), u;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(t) {
    return this.defaults = { ...this.defaults, ...t }, this;
  }
  lexer(t, e) {
    return Q.lex(t, e ?? this.defaults);
  }
  parser(t, e) {
    return J.parse(t, e ?? this.defaults);
  }
  parseMarkdown(t) {
    return (e, n) => {
      let s = { ...n }, r = { ...this.defaults, ...s }, o = this.onError(!!r.silent, !!r.async);
      if (this.defaults.async === !0 && s.async === !1) return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof e > "u" || e === null) return o(new Error("marked(): input parameter is undefined or null"));
      if (typeof e != "string") return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(e) + ", string expected"));
      if (r.hooks && (r.hooks.options = r, r.hooks.block = t), r.async) return (async () => {
        let a = r.hooks ? await r.hooks.preprocess(e) : e, u = await (r.hooks ? await r.hooks.provideLexer() : t ? Q.lex : Q.lexInline)(a, r), c = r.hooks ? await r.hooks.processAllTokens(u) : u;
        r.walkTokens && await Promise.all(this.walkTokens(c, r.walkTokens));
        let g = await (r.hooks ? await r.hooks.provideParser() : t ? J.parse : J.parseInline)(c, r);
        return r.hooks ? await r.hooks.postprocess(g) : g;
      })().catch(o);
      try {
        r.hooks && (e = r.hooks.preprocess(e));
        let a = (r.hooks ? r.hooks.provideLexer() : t ? Q.lex : Q.lexInline)(e, r);
        r.hooks && (a = r.hooks.processAllTokens(a)), r.walkTokens && this.walkTokens(a, r.walkTokens);
        let u = (r.hooks ? r.hooks.provideParser() : t ? J.parse : J.parseInline)(a, r);
        return r.hooks && (u = r.hooks.postprocess(u)), u;
      } catch (a) {
        return o(a);
      }
    };
  }
  onError(t, e) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, t) {
        let s = "<p>An error occurred:</p><pre>" + ae(n.message + "", !0) + "</pre>";
        return e ? Promise.resolve(s) : s;
      }
      if (e) return Promise.reject(n);
      throw n;
    };
  }
}, Ee = new Oa();
function v(t, e) {
  return Ee.parse(t, e);
}
v.options = v.setOptions = function(t) {
  return Ee.setOptions(t), v.defaults = Ee.defaults, ts(v.defaults), v;
};
v.getDefaults = wn;
v.defaults = $e;
v.use = function(...t) {
  return Ee.use(...t), v.defaults = Ee.defaults, ts(v.defaults), v;
};
v.walkTokens = function(t, e) {
  return Ee.walkTokens(t, e);
};
v.parseInline = Ee.parseInline;
v.Parser = J;
v.parser = J.parse;
v.Renderer = Rt;
v.TextRenderer = Rn;
v.Lexer = Q;
v.lexer = Q.lex;
v.Tokenizer = $t;
v.Hooks = tt;
v.parse = v;
v.options;
v.setOptions;
v.use;
v.walkTokens;
v.parseInline;
J.parse;
Q.lex;
const Pa = { CHILD: 2 }, La = (t) => (...e) => ({ _$litDirective$: t, values: e });
class Da {
  constructor(e) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(e, n, s) {
    this._$Ct = e, this._$AM = n, this._$Ci = s;
  }
  _$AS(e, n) {
    return this.update(e, n);
  }
  update(e, n) {
    return this.render(...n);
  }
}
class hn extends Da {
  constructor(e) {
    if (super(e), this.it = S, e.type !== Pa.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(e) {
    if (e === S || e == null) return this._t = void 0, this.it = e;
    if (e === Se) return e;
    if (typeof e != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (e === this.it) return this._t;
    this.it = e;
    const n = [e];
    return n.raw = n, this._t = { _$litType$: this.constructor.resultType, strings: n, values: [] };
  }
}
hn.directiveName = "unsafeHTML", hn.resultType = 1;
const Ma = La(hn), hs = gn`
  :host {
    /* Vanna 2.0 Brand Colors */
    --vanna-navy: rgb(2, 61, 96);
    --vanna-cream: rgb(231, 225, 207);
    --vanna-teal: rgb(21, 168, 168);
    --vanna-orange: rgb(254, 93, 38);
    --vanna-magenta: rgb(191, 19, 99);

    /* Color Palette - Light mode (default) */
    --vanna-background-root: rgb(255, 255, 255);
    --vanna-background-default: rgb(231, 225, 207);
    --vanna-background-higher: rgb(244, 246, 248);
    --vanna-background-highest: rgb(229, 231, 235);
    --vanna-background-subtle: rgb(248, 250, 252);
    --vanna-background-lower: rgb(239, 242, 245);

    --vanna-foreground-default: rgb(2, 61, 96);
    --vanna-foreground-dimmer: rgb(71, 85, 105);
    --vanna-foreground-dimmest: rgb(100, 116, 139);

    --vanna-accent-primary-default: rgb(21, 168, 168);
    --vanna-accent-primary-stronger: rgb(2, 61, 96);
    --vanna-accent-primary-strongest: rgb(2, 61, 96);
    --vanna-accent-primary-subtle: rgba(21, 168, 168, 0.1);
    --vanna-accent-primary-hover: rgb(21, 168, 168);

    --vanna-accent-positive-default: rgb(21, 168, 168);
    --vanna-accent-positive-stronger: rgb(2, 61, 96);
    --vanna-accent-positive-subtle: rgba(21, 168, 168, 0.1);

    --vanna-accent-negative-default: rgb(239, 68, 68);
    --vanna-accent-negative-stronger: rgb(220, 38, 38);
    --vanna-accent-negative-subtle: rgba(239, 68, 68, 0.1);

    --vanna-accent-warning-default: rgb(254, 93, 38);
    --vanna-accent-warning-stronger: rgb(254, 93, 38);
    --vanna-accent-warning-subtle: rgba(254, 93, 38, 0.1);

    /* Outline/Border colors */
    --vanna-outline-default: rgba(21, 168, 168, 0.3);
    --vanna-outline-dimmer: rgb(241, 245, 249);
    --vanna-outline-dimmest: rgb(248, 250, 252);
    --vanna-outline-hover: rgb(21, 168, 168);

    /* Typography */
    --vanna-font-family-default: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    --vanna-font-family-serif: "Roboto Slab", ui-serif, Georgia, serif;
    --vanna-font-family-mono: "Space Mono", ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Ubuntu Mono", monospace;

    /* Spacing scale */
    --vanna-space-0: 0px;
    --vanna-space-1: 4px;
    --vanna-space-2: 8px;
    --vanna-space-3: 12px;
    --vanna-space-4: 16px;
    --vanna-space-5: 20px;
    --vanna-space-6: 24px;
    --vanna-space-7: 28px;
    --vanna-space-8: 32px;
    --vanna-space-10: 40px;
    --vanna-space-12: 48px;
    --vanna-space-16: 64px;

    /* Border radius */
    --vanna-border-radius-sm: 6px;
    --vanna-border-radius-md: 10px;
    --vanna-border-radius-lg: 14px;
    --vanna-border-radius-xl: 20px;
    --vanna-border-radius-2xl: 24px;
    --vanna-border-radius-full: 9999px;

    /* Shadows - Preline-inspired */
    --vanna-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --vanna-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    --vanna-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --vanna-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --vanna-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    --vanna-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

    /* Animation durations */
    --vanna-duration-75: 75ms;
    --vanna-duration-100: 100ms;
    --vanna-duration-150: 150ms;
    --vanna-duration-200: 200ms;
    --vanna-duration-300: 300ms;
    --vanna-duration-500: 500ms;
    --vanna-duration-700: 700ms;

    /* Z-index scale */
    --vanna-z-dropdown: 1000;
    --vanna-z-sticky: 1020;
    --vanna-z-fixed: 1030;
    --vanna-z-modal: 1040;
    --vanna-z-popover: 1050;
    --vanna-z-tooltip: 1060;

    /* Chat-specific tokens */
    --vanna-chat-bubble-radius: 18px;
    --vanna-chat-bubble-radius-sm: 12px;
    --vanna-chat-spacing: 16px;
    --vanna-chat-avatar-size: 40px;
  }

  /* Dark theme overrides */
  :host([theme="dark"]) {
    --vanna-background-root: rgb(9, 11, 17);
    --vanna-background-default: rgb(15, 18, 25);
    --vanna-background-higher: rgb(24, 29, 39);
    --vanna-background-highest: rgb(31, 39, 51);
    --vanna-background-subtle: rgb(17, 21, 28);
    --vanna-background-lower: rgb(6, 8, 12);

    --vanna-foreground-default: rgb(248, 250, 252);
    --vanna-foreground-dimmer: rgb(203, 213, 225);
    --vanna-foreground-dimmest: rgb(148, 163, 184);

    --vanna-accent-primary-default: rgb(21, 168, 168);
    --vanna-accent-primary-stronger: rgb(21, 168, 168);
    --vanna-accent-primary-strongest: rgb(2, 61, 96);
    --vanna-accent-primary-subtle: rgba(21, 168, 168, 0.15);
    --vanna-accent-primary-hover: rgb(21, 168, 168);

    --vanna-accent-positive-default: rgb(21, 168, 168);
    --vanna-accent-positive-stronger: rgb(21, 168, 168);
    --vanna-accent-positive-subtle: rgba(21, 168, 168, 0.15);

    --vanna-accent-negative-default: rgb(248, 113, 113);
    --vanna-accent-negative-stronger: rgb(239, 68, 68);
    --vanna-accent-negative-subtle: rgba(248, 113, 113, 0.15);

    --vanna-accent-warning-default: rgb(254, 93, 38);
    --vanna-accent-warning-stronger: rgb(254, 93, 38);
    --vanna-accent-warning-subtle: rgba(254, 93, 38, 0.15);

    --vanna-outline-default: rgba(21, 168, 168, 0.3);
    --vanna-outline-dimmer: rgb(31, 41, 55);
    --vanna-outline-dimmest: rgb(17, 24, 39);
    --vanna-outline-hover: rgb(21, 168, 168);

    --vanna-shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.6);
    --vanna-shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5);
    --vanna-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
    --vanna-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
    --vanna-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    --vanna-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  }
`;
var Na = Object.defineProperty, za = Object.getOwnPropertyDescriptor, Fe = (t, e, n, s) => {
  for (var r = s > 1 ? void 0 : s ? za(e, n) : e, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (r = (s ? a(e, n, r) : a(r)) || r);
  return s && r && Na(e, n, r), r;
};
let me = class extends Ue {
  constructor() {
    super(...arguments), this.content = "", this.type = "assistant", this.markdown = !0, this.timestamp = Date.now(), this.theme = "light";
  }
  updated() {
    for (const t of this.renderRoot.querySelectorAll("a"))
      t.target = "_blank", t.rel = "noopener noreferrer";
  }
  render() {
    const t = this.markdown ? Ma(Ua(this.content)) : this.content;
    return O`
      <article class="message ${this.type}">
        <div class="content">${t}</div>
        <div class="timestamp">${this.formatTimestamp()}</div>
      </article>
    `;
  }
  formatTimestamp() {
    return new Date(this.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
};
me.styles = [
  hs,
  gn`
      :host {
        display: block;
        margin: 0 0 var(--vanna-space-4);
        font-family: var(--vanna-font-family-default);
      }

      .message {
        box-sizing: border-box;
        max-width: min(88%, 720px);
        padding: var(--vanna-space-4) var(--vanna-space-5);
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 18px 18px 18px 5px;
        background: var(--vanna-background-root);
        color: var(--vanna-foreground-default);
        box-shadow: var(--vanna-shadow-sm);
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      .message.user {
        margin-left: auto;
        border: 0;
        border-radius: 18px 18px 5px 18px;
        background: var(--vanna-accent-primary-default);
        color: white;
        white-space: pre-wrap;
      }

      .content > :first-child { margin-top: 0; }
      .content > :last-child { margin-bottom: 0; }
      .content p, .content ul, .content ol, .content pre, .content blockquote {
        margin: 0.65em 0;
      }
      .content pre {
        padding: 0.8em;
        border-radius: 8px;
        background: var(--vanna-background-higher);
        overflow-x: auto;
      }
      .content code {
        padding: 0.1em 0.3em;
        border-radius: 4px;
        background: var(--vanna-background-higher);
        font-family: var(--vanna-font-family-mono);
      }
      .content pre code { padding: 0; }
      .content a { color: var(--vanna-accent-primary-default); }
      .content blockquote {
        margin-left: 0;
        padding-left: 0.9em;
        border-left: 3px solid var(--vanna-outline-default);
        color: var(--vanna-foreground-dimmer);
      }

      .timestamp {
        margin-top: var(--vanna-space-2);
        color: var(--vanna-foreground-dimmest);
        font-size: 11px;
      }
      .user .timestamp { color: rgb(255 255 255 / 75%); text-align: right; }

      :host([theme='dark']) .message:not(.user) {
        background: var(--vanna-background-higher);
      }

      @media (max-width: 600px) {
        .message { max-width: 96%; }
      }
    `
];
Fe([
  B()
], me.prototype, "content", 2);
Fe([
  B()
], me.prototype, "type", 2);
Fe([
  B({ type: Boolean })
], me.prototype, "markdown", 2);
Fe([
  B({ type: Number })
], me.prototype, "timestamp", 2);
Fe([
  B({ reflect: !0 })
], me.prototype, "theme", 2);
me = Fe([
  Yr("vanna-message")
], me);
function Ua(t) {
  const e = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), n = v.parse(e, { async: !1 });
  return Xi.sanitize(n, {
    ALLOWED_TAGS: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul"
    ],
    ALLOWED_ATTR: ["href", "title"]
  });
}
const Ha = /* @__PURE__ */ new Set([
  "content-type",
  "accept",
  "x-request-id",
  "x-trace-id",
  "x-user-id"
]), Ba = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, Fa = /^(?:0|[1-9][0-9]{0,19})$/, qa = 18446744073709551615n;
function Fr(t) {
  return Ba.test(t);
}
function st(t) {
  return Fa.test(t) && BigInt(t) <= qa;
}
class U extends Error {
  constructor(e, n = "transport_error", s) {
    super(e), this.code = n, this.status = s, this.name = "VannaApiError";
  }
}
function In(t) {
  return le(t) && ee(t, ["error", "conversation_id", "request_id", "timestamp"]) && Cn(t) && le(t.error) && ee(t.error, ["code", "message"]) && typeof t.error.code == "string" && typeof t.error.message == "string";
}
function ds(t) {
  return le(t) && ee(t, ["progress", "conversation_id", "request_id", "timestamp"]) && Cn(t) && Ga(t.progress);
}
function fs(t) {
  const e = t.trim();
  if (!e || e.startsWith("//")) return !1;
  try {
    const n = new URL(e, globalThis.location?.origin ?? "http://localhost");
    return n.protocol === "http:" || n.protocol === "https:";
  } catch {
    return !1;
  }
}
class gs {
  constructor(e = {}) {
    this.baseUrl = e.baseUrl ?? "", this.sseEndpoint = e.sseEndpoint ?? "/api/vanna/v3/chat_sse", this.pollEndpoint = e.pollEndpoint ?? "/api/vanna/v3/chat_poll", this.customHeaders = {}, this.setCustomHeaders(e.customHeaders ?? {});
  }
  setCustomHeaders(e) {
    for (const n of Object.keys(e))
      if (Ha.has(n.toLowerCase()))
        throw new U(`The ${n} header is managed by the Vanna protocol.`);
    this.customHeaders = { ...e };
  }
  getCustomHeaders() {
    return { ...this.customHeaders };
  }
  async *streamChat(e, n) {
    const s = await fetch(this.resolveUrl(this.sseEndpoint), {
      method: "POST",
      headers: this.buildHeaders(n, "text/event-stream"),
      body: JSON.stringify(e)
    });
    this.assertResponseCorrelation(s, n), await this.assertOk(s);
    const r = s.body?.getReader();
    if (!r) throw new U("The server returned an empty response.");
    const o = new TextDecoder();
    let a = "";
    try {
      for (; ; ) {
        const { done: u, value: c } = await r.read();
        a += o.decode(c, { stream: !u }).replace(/\r\n/g, `
`);
        const g = a.split(`

`);
        a = g.pop() ?? "";
        for (const d of g) {
          const m = this.parseSseEvent(d);
          if (m === null) return;
          m && (this.assertPayloadCorrelation(m, n.requestId), yield m);
        }
        if (u) break;
      }
      if (a.trim()) {
        const u = this.parseSseEvent(a);
        if (u === null) return;
        u && (this.assertPayloadCorrelation(u, n.requestId), yield u);
      }
      throw new U("The server ended the stream before [DONE].");
    } finally {
      try {
        await r.cancel();
      } catch {
      }
      r.releaseLock();
    }
  }
  async sendPollMessage(e, n) {
    const s = await fetch(this.resolveUrl(this.pollEndpoint), {
      method: "POST",
      headers: this.buildHeaders(n, "application/json"),
      body: JSON.stringify(e)
    });
    this.assertResponseCorrelation(s, n), await this.assertOk(s);
    const r = await s.json();
    if (!Za(r))
      throw new U("The server returned an invalid polling response.");
    return this.assertPayloadCorrelation(r, n.requestId), r;
  }
  async downloadLocalFile(e, n) {
    const s = this.resolveLocalFileUrl(e);
    if (!s || !st(n))
      throw new U("The local file request is invalid.");
    const r = await fetch(s, {
      method: "GET",
      headers: { "X-User-Id": n }
    });
    if (!r.ok)
      throw new U(
        `File download failed with HTTP ${r.status}.`,
        "file_download_error",
        r.status
      );
    return r.blob();
  }
  generateId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  resolveUrl(e) {
    return /^https?:\/\//i.test(e) ? e : `${this.baseUrl}${e}`;
  }
  resolveLocalFileUrl(e) {
    const n = e.trim();
    if (!n || n.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(n))
      return null;
    const s = globalThis.location?.origin ?? "http://localhost";
    try {
      const r = new URL(this.baseUrl || "/", s).origin, o = this.resolveUrl(n);
      return new URL(o, s).origin === r ? o : null;
    } catch {
      return null;
    }
  }
  buildHeaders(e, n) {
    if (!Fr(e.requestId) || e.traceId !== void 0 && !Fr(e.traceId) || !st(e.userId))
      throw new U("The request correlation headers are invalid.");
    return {
      ...this.customHeaders,
      "Content-Type": "application/json",
      Accept: n,
      "X-Request-Id": e.requestId,
      ...e.traceId ? { "X-Trace-Id": e.traceId } : {},
      "X-User-Id": e.userId
    };
  }
  assertResponseCorrelation(e, n) {
    const s = n.traceId ?? n.requestId;
    if (e.headers.get("X-Request-Id") !== n.requestId || e.headers.get("X-Trace-Id") !== s)
      throw new U("The server returned mismatched request correlation.");
  }
  assertPayloadCorrelation(e, n) {
    if (e.request_id !== n)
      throw new U("The server returned mismatched request correlation.");
  }
  parseSseEvent(e) {
    const n = e.split(`
`).filter((r) => r.startsWith("data:")).map((r) => r.slice(5).trimStart()).join(`
`).trim();
    if (!n) return;
    if (n === "[DONE]") return null;
    let s;
    try {
      s = JSON.parse(n);
    } catch {
      throw new U("The server returned malformed stream data.");
    }
    if (!ms(s))
      throw new U("The server returned an unsupported component.");
    return s;
  }
  async assertOk(e) {
    if (e.ok) return;
    let n = "http_error", s = `Request failed with HTTP ${e.status}.`;
    try {
      const r = await e.json();
      In(r) && (n = r.error.code, s = r.error.message);
    } catch {
    }
    throw new U(s, n, e.status);
  }
}
function le(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function ja(t) {
  return t === null || typeof t == "string" || typeof t == "boolean" || typeof t == "number" && Number.isFinite(t);
}
function ee(t, e) {
  return Object.keys(t).every((n) => e.includes(n));
}
function Wa(t) {
  if (!le(t) || typeof t.type != "string") return !1;
  if (t.type === "text")
    return ee(t, ["type", "text"]) && typeof t.text == "string";
  if (t.type === "file")
    return ee(t, [
      "type",
      "name",
      "url",
      "media_type",
      "size_bytes",
      "row_count",
      "truncated",
      "expires_at"
    ]) && typeof t.name == "string" && t.name.length >= 1 && t.name.length <= 255 && t.name.trim() === t.name && !/[\\/\u0000-\u001f\u007f]/.test(t.name) && typeof t.url == "string" && fs(t.url) && typeof t.media_type == "string" && /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(t.media_type) && Number.isSafeInteger(t.size_bytes) && t.size_bytes >= 0 && Number.isSafeInteger(t.row_count) && t.row_count >= 0 && typeof t.truncated == "boolean" && typeof t.expires_at == "string" && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(t.expires_at) && Number.isFinite(Date.parse(t.expires_at));
  if (t.type === "dataframe") {
    if (!ee(t, ["type", "columns", "rows", "title", "truncated"]) || !Array.isArray(t.columns)) return !1;
    const e = t.columns;
    if (!e.every((s) => typeof s == "string")) return !1;
    const n = e;
    return new Set(n).size !== n.length || !Array.isArray(t.rows) || t.rows.length > 100 || typeof t.truncated != "boolean" || !(t.title === void 0 || t.title === null || typeof t.title == "string") ? !1 : t.rows.every((s) => le(s) && Object.keys(s).length === n.length && n.every((r) => r in s) && Object.values(s).every(ja));
  }
  return !1;
}
function Cn(t) {
  return typeof t.conversation_id == "string" && typeof t.request_id == "string" && typeof t.timestamp == "number" && Number.isFinite(t.timestamp);
}
function Ga(t) {
  return !le(t) || !ee(t, ["stage", "message"]) || typeof t.stage != "string" || typeof t.message != "string" || t.message.length < 1 || t.message.length > 120 ? !1 : [
    "analyzing",
    "preparing",
    "executing",
    "summarizing",
    "recovering"
  ].includes(t.stage);
}
function ms(t) {
  return !le(t) || !Cn(t) ? !1 : "component" in t ? ee(
    t,
    ["component", "conversation_id", "request_id", "timestamp"]
  ) && Wa(t.component) : "progress" in t ? ds(t) : ee(t, ["error", "conversation_id", "request_id", "timestamp"]) && le(t.error) && ee(t.error, ["code", "message"]) && typeof t.error.code == "string" && typeof t.error.message == "string";
}
function Za(t) {
  return !le(t) || !ee(
    t,
    ["chunks", "conversation_id", "request_id", "total_chunks"]
  ) || !Array.isArray(t.chunks) || typeof t.conversation_id != "string" || typeof t.request_id != "string" || !Number.isInteger(t.total_chunks) || t.total_chunks !== t.chunks.length ? !1 : t.chunks.every((e) => ms(e) && !In(e) && e.conversation_id === t.conversation_id && e.request_id === t.request_id);
}
const no = new gs();
var Va = Object.defineProperty, Xa = Object.getOwnPropertyDescriptor, F = (t, e, n, s) => {
  for (var r = s > 1 ? void 0 : s ? Xa(e, n) : e, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (r = (s ? a(e, n, r) : a(r)) || r);
  return s && r && Va(e, n, r), r;
};
let L = class extends Ue {
  constructor() {
    super(...arguments), this.title = "Vanna AI Chat", this.subtitle = "", this.placeholder = "Ask me anything...", this.disabled = !1, this.theme = "light", this.apiBaseUrl = "", this.sseEndpoint = "/api/vanna/v3/chat_sse", this.pollEndpoint = "/api/vanna/v3/chat_poll", this.userId = "", this.currentMessage = "", this.busy = !1, this.items = [], this.currentProgress = null, this.showBusyStatus = !1, this.conversationId = this.generateId(), this.customHeaders = {}, this.starterRequested = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this.userId = this.resolveLocalUserId(this.userId), this.starterRequested || (this.starterRequested = !0, this.requestStarter());
  }
  render() {
    const t = this.disabled || this.busy;
    return O`
      <section class="shell" aria-busy=${String(this.busy)}>
        <header>
          <div class="heading">
            <h1>${this.title}</h1>
            ${this.subtitle ? O`<p class="subtitle">${this.subtitle}</p>` : S}
          </div>
          <label class="user-switch">
            XPD User ID
            <input
              .value=${this.userId}
              ?disabled=${this.busy}
              inputmode="numeric"
              pattern="(?:0|[1-9][0-9]*)"
              maxlength="20"
              @change=${this.handleUserIdChange}
            >
          </label>
        </header>
        <main class="messages" aria-live="polite">
          ${this.items.length === 0 && !this.busy ? O`<div class="empty">Ask a question to begin.</div>` : this.items.map((e) => this.renderItem(e))}
          ${this.busy && this.showBusyStatus ? O`<p class="busy" role="status" aria-live="polite" aria-atomic="true">
              ${this.currentProgress?.progress.message ?? "Thinking…"}
            </p>` : S}
        </main>
        <form @submit=${this.handleSubmit}>
          <textarea
            .value=${this.currentMessage}
            placeholder=${this.placeholder}
            ?disabled=${t}
            aria-label=${this.placeholder}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
          ></textarea>
          <button type="submit" ?disabled=${t || !this.currentMessage.trim()}>
            Send
          </button>
        </form>
      </section>
    `;
  }
  async sendMessage(t) {
    const e = (t ?? this.currentMessage).trim();
    return !e || this.disabled || this.busy ? !1 : (this.currentMessage = "", this.items = [...this.items, {
      kind: "user",
      id: this.generateId(),
      text: e,
      timestamp: Date.now()
    }], this.dispatchEvent(new CustomEvent("message-sent", {
      detail: { message: e, conversationId: this.conversationId },
      bubbles: !0,
      composed: !0
    })), await this.performRequest({ message: e, conversation_id: this.conversationId }), !0);
  }
  addMessage(t, e = "assistant") {
    const n = Date.now();
    this.items = e === "user" ? [...this.items, { kind: "user", id: this.generateId(), text: t, timestamp: n }] : [...this.items, {
      kind: "component",
      id: this.generateId(),
      component: { type: "text", text: t },
      timestamp: n
    }], this.scrollToEnd();
  }
  clearMessages() {
    this.items = [], this.currentProgress = null, this.conversationId = this.generateId();
  }
  setCustomHeaders(t) {
    this.customHeaders = { ...t };
  }
  updateApiBaseUrl(t) {
    this.apiBaseUrl = t;
  }
  getApiClient() {
    return this.createClient();
  }
  async requestStarter() {
    await this.performRequest({
      message: "",
      conversation_id: this.conversationId,
      metadata: { starter_ui_request: !0 }
    }, !0);
  }
  async performRequest(t, e = !1) {
    this.busy = !0, this.currentProgress = null, this.showBusyStatus = !e;
    const n = this.createClient(), s = `turn_${n.generateId()}`, r = {
      requestId: s,
      traceId: `trace_${n.generateId()}`,
      userId: this.userId
    };
    let o = !1;
    try {
      try {
        for await (const a of n.streamChat(t, r)) {
          if (o = !0, In(a))
            throw new U(a.error.message, a.error.code);
          if (ds(a)) {
            this.applyProgress(a);
            continue;
          }
          this.appendChunk(a);
        }
      } catch (a) {
        if (o) throw a;
      }
      o || await this.consumePoll(n, t, s);
    } catch (a) {
      e || this.appendError(a);
    } finally {
      this.currentProgress = null, this.showBusyStatus = !1, this.busy = !1, await this.scrollToEnd();
    }
  }
  async consumePoll(t, e, n) {
    const s = await t.sendPollMessage(e, {
      requestId: n,
      traceId: `trace_${t.generateId()}`,
      userId: this.userId
    });
    for (const r of s.chunks) this.appendChunk(r);
  }
  appendChunk(t) {
    this.conversationId = t.conversation_id || this.conversationId, this.items = [...this.items, {
      kind: "component",
      id: `${t.request_id}-${t.timestamp}-${this.items.length}`,
      component: t.component,
      timestamp: t.timestamp * 1e3
    }], this.dispatchEvent(new CustomEvent("chunk-received", {
      detail: t,
      bubbles: !0,
      composed: !0
    })), this.scrollToEnd();
  }
  applyProgress(t) {
    this.conversationId = t.conversation_id || this.conversationId, this.currentProgress = t, this.showBusyStatus = !0, this.dispatchEvent(new CustomEvent("progress-received", {
      detail: t,
      bubbles: !0,
      composed: !0
    })), this.scrollToEnd();
  }
  appendError(t) {
    const e = t instanceof U ? t.message : "The request could not be completed. Please try again.";
    this.addMessage(e, "assistant"), this.dispatchEvent(new CustomEvent("chat-error", {
      detail: { message: e },
      bubbles: !0,
      composed: !0
    }));
  }
  renderItem(t) {
    if (t.kind === "user")
      return O`<vanna-message
        type="user"
        .content=${t.text}
        .markdown=${!1}
        .timestamp=${t.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
    const e = t.component;
    return e.type === "text" ? O`<vanna-message
        type="assistant"
        .content=${e.text}
        .markdown=${!0}
        .timestamp=${t.timestamp}
        theme=${this.theme}
      ></vanna-message>` : e.type === "dataframe" ? this.renderDataFrame(e) : this.renderFile(e, t.timestamp);
  }
  renderFile(t, e) {
    if (!fs(t.url))
      return O`<vanna-message
        type="assistant"
        content="Unsupported file URL"
        .timestamp=${e}
        theme=${this.theme}
      ></vanna-message>`;
    const n = /^https?:\/\//i.test(t.url), s = O`
        <span class="file-icon" aria-hidden="true">⇩</span>
        <span class="file-copy">
          <span class="file-title">下载查询结果</span>
          <span class="file-name">${t.name}</span>
          <span class="file-meta">
            XLSX · ${this.formatBytes(t.size_bytes)} ·
            ${t.row_count.toLocaleString("en-US")} 行 ·
            有效期至 ${this.formatExpiry(t.expires_at)}
          </span>
          ${t.truncated ? O`<span class="file-warning">结果已截断，仅包含前 20,000 行。</span>` : S}
        </span>
        <span class="file-action">下载</span>
    `;
    return O`<div class="component">
      ${n ? O`<a
            class="file-card"
            href=${t.url}
            target="_blank"
            rel="noopener noreferrer"
          >${s}</a>` : O`<button
            type="button"
            class="file-card"
            @click=${() => this.downloadLocalFile(t)}
          >${s}</button>`}
    </div>`;
  }
  async downloadLocalFile(t) {
    try {
      const e = await this.createClient().downloadLocalFile(t.url, this.userId), n = URL.createObjectURL(e);
      try {
        const s = document.createElement("a");
        s.href = n, s.download = t.name, s.hidden = !0, document.body.append(s), s.click(), s.remove();
      } finally {
        URL.revokeObjectURL(n);
      }
    } catch (e) {
      this.appendError(e);
    }
  }
  renderDataFrame(t) {
    return O`<section class="component table-card">
      ${t.title ? O`<h2 class="table-title">${t.title}</h2>` : S}
      <div class="table-scroll">
        <table>
          <thead><tr>${t.columns.map((e) => O`<th scope="col">${e}</th>`)}</tr></thead>
          <tbody>
            ${t.rows.length ? t.rows.map((e) => O`<tr>${t.columns.map(
      (n) => O`<td>${this.formatCell(e[n])}</td>`
    )}</tr>`) : O`<tr><td colspan=${Math.max(t.columns.length, 1)}>No rows returned.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${t.truncated ? O`<p class="table-note">Showing the first ${t.rows.length} rows.</p>` : S}
    </section>`;
  }
  formatBytes(t) {
    return t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
  }
  formatExpiry(t) {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(t));
  }
  formatCell(t) {
    return t == null ? "—" : String(t);
  }
  createClient() {
    return new gs({
      baseUrl: this.apiBaseUrl,
      sseEndpoint: this.sseEndpoint,
      pollEndpoint: this.pollEndpoint,
      customHeaders: this.customHeaders
    });
  }
  handleUserIdChange(t) {
    const e = t.target, n = e.value.trim();
    if (!st(n)) {
      e.value = this.userId, this.appendError(new U("XPD User ID must be a canonical uint64 value."));
      return;
    }
    n !== this.userId && (this.userId = n, this.writeLocalUserId(n), this.clearMessages(), this.requestStarter());
  }
  resolveLocalUserId(t) {
    if (st(t))
      return this.writeLocalUserId(t), t;
    try {
      const n = globalThis.localStorage?.getItem(L.localUserStorageKey) ?? "";
      if (st(n)) return n;
    } catch {
    }
    const e = this.generateLocalUserId();
    return this.writeLocalUserId(e), e;
  }
  writeLocalUserId(t) {
    try {
      globalThis.localStorage?.setItem(L.localUserStorageKey, t);
    } catch {
    }
  }
  generateLocalUserId() {
    if (globalThis.crypto?.getRandomValues) {
      const t = globalThis.crypto.getRandomValues(new Uint32Array(2));
      return (BigInt(t[0]) << 32n | BigInt(t[1])).toString();
    }
    return String(Math.max(1, Date.now()));
  }
  handleSubmit(t) {
    t.preventDefault(), this.sendMessage();
  }
  handleInput(t) {
    this.currentMessage = t.target.value;
  }
  handleKeydown(t) {
    t.key === "Enter" && !t.shiftKey && (t.preventDefault(), this.sendMessage());
  }
  generateId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  async scrollToEnd() {
    await this.updateComplete;
    const t = this.renderRoot.querySelector(".messages");
    t && (t.scrollTop = t.scrollHeight);
  }
};
L.styles = [
  hs,
  gn`
      :host {
        display: block;
        width: min(100%, 960px);
        height: min(760px, 90vh);
        min-height: 420px;
        color: var(--vanna-foreground-default);
        font-family: var(--vanna-font-family-default);
      }

      .shell {
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100%;
        overflow: hidden;
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 18px;
        background: var(--vanna-background-root);
        box-shadow: var(--vanna-shadow-lg);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--vanna-space-4);
        padding: var(--vanna-space-5) var(--vanna-space-6);
        border-bottom: 1px solid var(--vanna-outline-dimmer);
      }
      .heading { min-width: 0; }
      h1 { margin: 0; font-size: 18px; font-weight: 650; }
      .subtitle {
        margin: 4px 0 0;
        color: var(--vanna-foreground-dimmer);
        font-size: 13px;
      }
      .user-switch {
        display: grid;
        gap: 3px;
        color: var(--vanna-foreground-dimmer);
        font-size: 11px;
      }
      .user-switch input {
        width: 150px;
        padding: 6px 8px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 8px;
        background: var(--vanna-background-root);
        color: var(--vanna-foreground-default);
        font: inherit;
      }

      .messages {
        overflow: auto;
        padding: var(--vanna-space-6);
        scroll-behavior: smooth;
      }
      .empty {
        display: grid;
        height: 100%;
        place-items: center;
        color: var(--vanna-foreground-dimmer);
        text-align: center;
      }

      .component { margin-bottom: var(--vanna-space-4); }
      .table-card {
        overflow: hidden;
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 12px;
        background: var(--vanna-background-root);
      }
      .table-title {
        margin: 0;
        padding: 12px 14px;
        border-bottom: 1px solid var(--vanna-outline-dimmer);
        font-size: 14px;
      }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--vanna-outline-dimmer);
        text-align: left;
        white-space: nowrap;
      }
      th { background: var(--vanna-background-higher); font-weight: 650; }
      tbody tr:last-child td { border-bottom: 0; }
      .table-note {
        margin: 0;
        padding: 9px 12px;
        border-top: 1px solid var(--vanna-outline-dimmer);
        color: var(--vanna-foreground-dimmer);
        font-size: 12px;
      }
      .file-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 13px 14px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 12px;
        background: var(--vanna-background-root);
        color: var(--vanna-accent-primary-default);
        text-decoration: none;
        width: 100%;
        box-sizing: border-box;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .file-card:hover { background: var(--vanna-background-higher); }
      .file-icon { font-size: 22px; line-height: 1; }
      .file-copy { min-width: 0; }
      .file-title { display: block; font-weight: 650; }
      .file-name {
        display: block;
        overflow: hidden;
        margin-top: 3px;
        color: var(--vanna-foreground-dimmer);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .file-meta, .file-warning {
        margin: 7px 0 0;
        color: var(--vanna-foreground-dimmer);
        font-size: 12px;
      }
      .file-warning { color: var(--vanna-warning-default, #9a6700); }
      .file-action { font-size: 13px; font-weight: 650; }

      .busy {
        margin: 0 0 var(--vanna-space-4);
        color: var(--vanna-foreground-dimmer);
        font-size: 13px;
      }
      .busy::before {
        content: '';
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 8px;
        border-radius: 50%;
        background: var(--vanna-accent-primary-default);
        animation: pulse 1s ease-in-out infinite alternate;
      }
      @keyframes pulse { to { opacity: 0.3; } }

      form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--vanna-space-3);
        padding: var(--vanna-space-4);
        border-top: 1px solid var(--vanna-outline-dimmer);
        background: var(--vanna-background-higher);
      }
      textarea {
        box-sizing: border-box;
        min-height: 44px;
        max-height: 130px;
        resize: vertical;
        padding: 11px 13px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 10px;
        background: var(--vanna-background-root);
        color: var(--vanna-foreground-default);
        font: inherit;
        line-height: 1.4;
      }
      textarea:focus {
        border-color: var(--vanna-accent-primary-default);
        outline: 2px solid color-mix(in srgb, var(--vanna-accent-primary-default) 20%, transparent);
      }
      form > button {
        min-width: 82px;
        border: 0;
        border-radius: 10px;
        background: var(--vanna-accent-primary-default);
        color: white;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
      }
      form > button:disabled, textarea:disabled { cursor: not-allowed; opacity: 0.55; }

      :host([theme='dark']) .shell,
      :host([theme='dark']) .table-card,
      :host([theme='dark']) textarea {
        background: var(--vanna-background-higher);
      }

      @media (max-width: 600px) {
        :host { height: 100dvh; min-height: 0; }
        .shell { border-width: 0; border-radius: 0; }
        header, .messages { padding: var(--vanna-space-4); }
        form { grid-template-columns: 1fr; }
        button { min-height: 42px; }
      }
    `
];
L.localUserStorageKey = "vanna-xpd-user-id";
F([
  B()
], L.prototype, "title", 2);
F([
  B()
], L.prototype, "subtitle", 2);
F([
  B()
], L.prototype, "placeholder", 2);
F([
  B({ type: Boolean })
], L.prototype, "disabled", 2);
F([
  B({ reflect: !0 })
], L.prototype, "theme", 2);
F([
  B({ attribute: "api-base" })
], L.prototype, "apiBaseUrl", 2);
F([
  B({ attribute: "sse-endpoint" })
], L.prototype, "sseEndpoint", 2);
F([
  B({ attribute: "poll-endpoint" })
], L.prototype, "pollEndpoint", 2);
F([
  B({ attribute: "user-id" })
], L.prototype, "userId", 2);
F([
  ot()
], L.prototype, "currentMessage", 2);
F([
  ot()
], L.prototype, "busy", 2);
F([
  ot()
], L.prototype, "items", 2);
F([
  ot()
], L.prototype, "currentProgress", 2);
F([
  ot()
], L.prototype, "showBusyStatus", 2);
L = F([
  Yr("vanna-chat")
], L);
typeof console < "u" && console.info("Vanna WebComponent 3.0.0 (2026-08-31T08:36:41.613Z)");
export {
  gs as VannaApiClient,
  U as VannaApiError,
  L as VannaChat,
  me as VannaMessage,
  no as apiClient,
  st as isCanonicalUserId,
  In as isChatStreamError,
  ds as isChatStreamProgress,
  Fr as isSafeIdentifier,
  fs as isSafeLink,
  Ua as renderSafeMarkdown
};
