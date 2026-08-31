const wt = globalThis, un = wt.ShadowRoot && (wt.ShadyCSS === void 0 || wt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, hn = /* @__PURE__ */ Symbol(), lr = /* @__PURE__ */ new WeakMap();
let Hr = class {
  constructor(e, n, s) {
    if (this._$cssResult$ = !0, s !== hn) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = n;
  }
  get styleSheet() {
    let e = this.o;
    const n = this.t;
    if (un && e === void 0) {
      const s = n !== void 0 && n.length === 1;
      s && (e = lr.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && lr.set(n, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Fs = (t) => new Hr(typeof t == "string" ? t : t + "", void 0, hn), dn = (t, ...e) => {
  const n = t.length === 1 ? t[0] : e.reduce((s, r, o) => s + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + t[o + 1], t[0]);
  return new Hr(n, t, hn);
}, qs = (t, e) => {
  if (un) t.adoptedStyleSheets = e.map((n) => n instanceof CSSStyleSheet ? n : n.styleSheet);
  else for (const n of e) {
    const s = document.createElement("style"), r = wt.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = n.cssText, t.appendChild(s);
  }
}, cr = un ? (t) => t : (t) => t instanceof CSSStyleSheet ? ((e) => {
  let n = "";
  for (const s of e.cssRules) n += s.cssText;
  return Fs(n);
})(t) : t;
const { is: js, defineProperty: Ws, getOwnPropertyDescriptor: Gs, getOwnPropertyNames: Ys, getOwnPropertySymbols: Zs, getPrototypeOf: Vs } = Object, $t = globalThis, pr = $t.trustedTypes, Xs = pr ? pr.emptyScript : "", Ks = $t.reactiveElementPolyfillSupport, nt = (t, e) => t, vt = { toAttribute(t, e) {
  switch (e) {
    case Boolean:
      t = t ? Xs : null;
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
} }, fn = (t, e) => !js(t, e), ur = { attribute: !0, type: String, converter: vt, reflect: !1, useDefault: !1, hasChanged: fn };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), $t.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let Ne = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, n = ur) {
    if (n.state && (n.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((n = Object.create(n)).wrapped = !0), this.elementProperties.set(e, n), !n.noAccessor) {
      const s = /* @__PURE__ */ Symbol(), r = this.getPropertyDescriptor(e, s, n);
      r !== void 0 && Ws(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, n, s) {
    const { get: r, set: o } = Gs(this.prototype, e) ?? { get() {
      return this[n];
    }, set(a) {
      this[n] = a;
    } };
    return { get: r, set(a) {
      const p = r?.call(this);
      o?.call(this, a), this.requestUpdate(e, p, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ur;
  }
  static _$Ei() {
    if (this.hasOwnProperty(nt("elementProperties"))) return;
    const e = Vs(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(nt("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(nt("properties"))) {
      const n = this.properties, s = [...Ys(n), ...Zs(n)];
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
      for (const r of s) n.unshift(cr(r));
    } else e !== void 0 && n.push(cr(e));
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
    return qs(e, this.constructor.elementStyles), e;
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
      const o = (s.converter?.toAttribute !== void 0 ? s.converter : vt).toAttribute(n, s.type);
      this._$Em = e, o == null ? this.removeAttribute(r) : this.setAttribute(r, o), this._$Em = null;
    }
  }
  _$AK(e, n) {
    const s = this.constructor, r = s._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = s.getPropertyOptions(r), a = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : vt;
      this._$Em = r;
      const p = a.fromAttribute(n, o.type);
      this[r] = p ?? this._$Ej?.get(r) ?? p, this._$Em = null;
    }
  }
  requestUpdate(e, n, s, r = !1, o) {
    if (e !== void 0) {
      const a = this.constructor;
      if (r === !1 && (o = this[e]), s ??= a.getPropertyOptions(e), !((s.hasChanged ?? fn)(o, n) || s.useDefault && s.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, s)))) return;
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
        const { wrapped: a } = o, p = this[r];
        a !== !0 || this._$AL.has(r) || p === void 0 || this.C(r, void 0, o, p);
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
Ne.elementStyles = [], Ne.shadowRootOptions = { mode: "open" }, Ne[nt("elementProperties")] = /* @__PURE__ */ new Map(), Ne[nt("finalized")] = /* @__PURE__ */ new Map(), Ks?.({ ReactiveElement: Ne }), ($t.reactiveElementVersions ??= []).push("2.1.2");
const gn = globalThis, hr = (t) => t, At = gn.trustedTypes, dr = At ? At.createPolicy("lit-html", { createHTML: (t) => t }) : void 0, Br = "$lit$", de = `lit$${Math.random().toFixed(9).slice(2)}$`, Fr = "?" + de, Qs = `<${Fr}>`, Ae = document, st = () => Ae.createComment(""), it = (t) => t === null || typeof t != "object" && typeof t != "function", mn = Array.isArray, Js = (t) => mn(t) || typeof t?.[Symbol.iterator] == "function", Xt = `[ 	
\f\r]`, Ze = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, fr = /-->/g, gr = />/g, xe = RegExp(`>|${Xt}(?:([^\\s"'>=/]+)(${Xt}*=${Xt}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), mr = /'/g, br = /"/g, qr = /^(?:script|style|textarea|title)$/i, ei = (t) => (e, ...n) => ({ _$litType$: t, strings: e, values: n }), D = ei(1), Te = /* @__PURE__ */ Symbol.for("lit-noChange"), R = /* @__PURE__ */ Symbol.for("lit-nothing"), yr = /* @__PURE__ */ new WeakMap(), ve = Ae.createTreeWalker(Ae, 129);
function jr(t, e) {
  if (!mn(t) || !t.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return dr !== void 0 ? dr.createHTML(e) : e;
}
const ti = (t, e) => {
  const n = t.length - 1, s = [];
  let r, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = Ze;
  for (let p = 0; p < n; p++) {
    const c = t[p];
    let g, d, b = -1, y = 0;
    for (; y < c.length && (a.lastIndex = y, d = a.exec(c), d !== null); ) y = a.lastIndex, a === Ze ? d[1] === "!--" ? a = fr : d[1] !== void 0 ? a = gr : d[2] !== void 0 ? (qr.test(d[2]) && (r = RegExp("</" + d[2], "g")), a = xe) : d[3] !== void 0 && (a = xe) : a === xe ? d[0] === ">" ? (a = r ?? Ze, b = -1) : d[1] === void 0 ? b = -2 : (b = a.lastIndex - d[2].length, g = d[1], a = d[3] === void 0 ? xe : d[3] === '"' ? br : mr) : a === br || a === mr ? a = xe : a === fr || a === gr ? a = Ze : (a = xe, r = void 0);
    const A = a === xe && t[p + 1].startsWith("/>") ? " " : "";
    o += a === Ze ? c + Qs : b >= 0 ? (s.push(g), c.slice(0, b) + Br + c.slice(b) + de + A) : c + de + (b === -2 ? p : A);
  }
  return [jr(t, o + (t[n] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
let rn = class Wr {
  constructor({ strings: e, _$litType$: n }, s) {
    let r;
    this.parts = [];
    let o = 0, a = 0;
    const p = e.length - 1, c = this.parts, [g, d] = ti(e, n);
    if (this.el = Wr.createElement(g, s), ve.currentNode = this.el.content, n === 2 || n === 3) {
      const b = this.el.content.firstChild;
      b.replaceWith(...b.childNodes);
    }
    for (; (r = ve.nextNode()) !== null && c.length < p; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const b of r.getAttributeNames()) if (b.endsWith(Br)) {
          const y = d[a++], A = r.getAttribute(b).split(de), w = /([.?@])?(.*)/.exec(y);
          c.push({ type: 1, index: o, name: w[2], strings: A, ctor: w[1] === "." ? ri : w[1] === "?" ? si : w[1] === "@" ? ii : Rt }), r.removeAttribute(b);
        } else b.startsWith(de) && (c.push({ type: 6, index: o }), r.removeAttribute(b));
        if (qr.test(r.tagName)) {
          const b = r.textContent.split(de), y = b.length - 1;
          if (y > 0) {
            r.textContent = At ? At.emptyScript : "";
            for (let A = 0; A < y; A++) r.append(b[A], st()), ve.nextNode(), c.push({ type: 2, index: ++o });
            r.append(b[y], st());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Fr) c.push({ type: 2, index: o });
      else {
        let b = -1;
        for (; (b = r.data.indexOf(de, b + 1)) !== -1; ) c.push({ type: 7, index: o }), b += de.length - 1;
      }
      o++;
    }
  }
  static createElement(e, n) {
    const s = Ae.createElement("template");
    return s.innerHTML = e, s;
  }
};
function Be(t, e, n = t, s) {
  if (e === Te) return e;
  let r = s !== void 0 ? n._$Co?.[s] : n._$Cl;
  const o = it(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== o && (r?._$AO?.(!1), o === void 0 ? r = void 0 : (r = new o(t), r._$AT(t, n, s)), s !== void 0 ? (n._$Co ??= [])[s] = r : n._$Cl = r), r !== void 0 && (e = Be(t, r._$AS(t, e.values), r, s)), e;
}
class ni {
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
    const { el: { content: n }, parts: s } = this._$AD, r = (e?.creationScope ?? Ae).importNode(n, !0);
    ve.currentNode = r;
    let o = ve.nextNode(), a = 0, p = 0, c = s[0];
    for (; c !== void 0; ) {
      if (a === c.index) {
        let g;
        c.type === 2 ? g = new bn(o, o.nextSibling, this, e) : c.type === 1 ? g = new c.ctor(o, c.name, c.strings, this, e) : c.type === 6 && (g = new ai(o, this, e)), this._$AV.push(g), c = s[++p];
      }
      a !== c?.index && (o = ve.nextNode(), a++);
    }
    return ve.currentNode = Ae, r;
  }
  p(e) {
    let n = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, n), n += s.strings.length - 2) : s._$AI(e[n])), n++;
  }
}
let bn = class Gr {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, n, s, r) {
    this.type = 2, this._$AH = R, this._$AN = void 0, this._$AA = e, this._$AB = n, this._$AM = s, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
    e = Be(this, e, n), it(e) ? e === R || e == null || e === "" ? (this._$AH !== R && this._$AR(), this._$AH = R) : e !== this._$AH && e !== Te && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Js(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== R && it(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Ae.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: n, _$litType$: s } = e, r = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = rn.createElement(jr(s.h, s.h[0]), this.options)), s);
    if (this._$AH?._$AD === r) this._$AH.p(n);
    else {
      const o = new ni(r, this), a = o.u(this.options);
      o.p(n), this.T(a), this._$AH = o;
    }
  }
  _$AC(e) {
    let n = yr.get(e.strings);
    return n === void 0 && yr.set(e.strings, n = new rn(e)), n;
  }
  k(e) {
    mn(this._$AH) || (this._$AH = [], this._$AR());
    const n = this._$AH;
    let s, r = 0;
    for (const o of e) r === n.length ? n.push(s = new Gr(this.O(st()), this.O(st()), this, this.options)) : s = n[r], s._$AI(o), r++;
    r < n.length && (this._$AR(s && s._$AB.nextSibling, r), n.length = r);
  }
  _$AR(e = this._$AA.nextSibling, n) {
    for (this._$AP?.(!1, !0, n); e !== this._$AB; ) {
      const s = hr(e).nextSibling;
      hr(e).remove(), e = s;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
};
class Rt {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, n, s, r, o) {
    this.type = 1, this._$AH = R, this._$AN = void 0, this.element = e, this.name = n, this._$AM = r, this.options = o, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = R;
  }
  _$AI(e, n = this, s, r) {
    const o = this.strings;
    let a = !1;
    if (o === void 0) e = Be(this, e, n, 0), a = !it(e) || e !== this._$AH && e !== Te, a && (this._$AH = e);
    else {
      const p = e;
      let c, g;
      for (e = o[0], c = 0; c < o.length - 1; c++) g = Be(this, p[s + c], n, c), g === Te && (g = this._$AH[c]), a ||= !it(g) || g !== this._$AH[c], g === R ? e = R : e !== R && (e += (g ?? "") + o[c + 1]), this._$AH[c] = g;
    }
    a && !r && this.j(e);
  }
  j(e) {
    e === R ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
let ri = class extends Rt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === R ? void 0 : e;
  }
}, si = class extends Rt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== R);
  }
}, ii = class extends Rt {
  constructor(e, n, s, r, o) {
    super(e, n, s, r, o), this.type = 5;
  }
  _$AI(e, n = this) {
    if ((e = Be(this, e, n, 0) ?? R) === Te) return;
    const s = this._$AH, r = e === R && s !== R || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, o = e !== R && (s === R || r);
    r && this.element.removeEventListener(this.name, this, s), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
};
class ai {
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
const oi = gn.litHtmlPolyfillSupport;
oi?.(rn, bn), (gn.litHtmlVersions ??= []).push("3.3.3");
const li = (t, e, n) => {
  const s = n?.renderBefore ?? e;
  let r = s._$litPart$;
  if (r === void 0) {
    const o = n?.renderBefore ?? null;
    s._$litPart$ = r = new bn(e.insertBefore(st(), o), o, void 0, n ?? {});
  }
  return r._$AI(t), r;
};
const yn = globalThis;
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = li(n, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Te;
  }
};
Ue._$litElement$ = !0, Ue.finalized = !0, yn.litElementHydrateSupport?.({ LitElement: Ue });
const ci = yn.litElementPolyfillSupport;
ci?.({ LitElement: Ue });
(yn.litElementVersions ??= []).push("4.2.2");
const Yr = (t) => (e, n) => {
  n !== void 0 ? n.addInitializer(() => {
    customElements.define(t, e);
  }) : customElements.define(t, e);
};
const pi = { attribute: !0, type: String, converter: vt, reflect: !1, hasChanged: fn }, ui = (t = pi, e, n) => {
  const { kind: s, metadata: r } = n;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), s === "setter" && ((t = Object.create(t)).wrapped = !0), o.set(n.name, t), s === "accessor") {
    const { name: a } = n;
    return { set(p) {
      const c = e.get.call(this);
      e.set.call(this, p), this.requestUpdate(a, c, t, !0, p);
    }, init(p) {
      return p !== void 0 && this.C(a, void 0, t, p), p;
    } };
  }
  if (s === "setter") {
    const { name: a } = n;
    return function(p) {
      const c = this[a];
      e.call(this, p), this.requestUpdate(a, c, t, !0, p);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function W(t) {
  return (e, n) => typeof n == "object" ? ui(t, e, n) : ((s, r, o) => {
    const a = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, s), a ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(t, e, n);
}
function xn(t) {
  return W({ ...t, state: !0, attribute: !1 });
}
function xr(t, e) {
  (e == null || e > t.length) && (e = t.length);
  for (var n = 0, s = Array(e); n < e; n++) s[n] = t[n];
  return s;
}
function hi(t) {
  if (Array.isArray(t)) return t;
}
function di(t, e) {
  var n = t == null ? null : typeof Symbol < "u" && t[Symbol.iterator] || t["@@iterator"];
  if (n != null) {
    var s, r, o, a, p = [], c = !0, g = !1;
    try {
      if (o = (n = n.call(t)).next, e !== 0) for (; !(c = (s = o.call(n)).done) && (p.push(s.value), p.length !== e); c = !0) ;
    } catch (d) {
      g = !0, r = d;
    } finally {
      try {
        if (!c && n.return != null && (a = n.return(), Object(a) !== a)) return;
      } finally {
        if (g) throw r;
      }
    }
    return p;
  }
}
function fi() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function gi(t, e) {
  return hi(t) || di(t, e) || mi(t, e) || fi();
}
function mi(t, e) {
  if (t) {
    if (typeof t == "string") return xr(t, e);
    var n = {}.toString.call(t).slice(8, -1);
    return n === "Object" && t.constructor && (n = t.constructor.name), n === "Map" || n === "Set" ? Array.from(t) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? xr(t, e) : void 0;
  }
}
const Zr = Object.entries, kr = Object.setPrototypeOf, bi = Object.isFrozen, yi = Object.getPrototypeOf, xi = Object.getOwnPropertyDescriptor;
let I = Object.freeze, L = Object.seal, ze = Object.create, Vr = typeof Reflect < "u" && Reflect, sn = Vr.apply, an = Vr.construct;
I || (I = function(e) {
  return e;
});
L || (L = function(e) {
  return e;
});
sn || (sn = function(e, n) {
  for (var s = arguments.length, r = new Array(s > 2 ? s - 2 : 0), o = 2; o < s; o++)
    r[o - 2] = arguments[o];
  return e.apply(n, r);
});
an || (an = function(e) {
  for (var n = arguments.length, s = new Array(n > 1 ? n - 1 : 0), r = 1; r < n; r++)
    s[r - 1] = arguments[r];
  return new e(...s);
});
const _e = P(Array.prototype.forEach), ki = P(Array.prototype.lastIndexOf), _r = P(Array.prototype.pop), Ve = P(Array.prototype.push), _i = P(Array.prototype.splice), He = Array.isArray, et = P(String.prototype.toLowerCase), Kt = P(String.prototype.toString), wr = P(String.prototype.match), Xe = P(String.prototype.replace), vr = P(String.prototype.indexOf), wi = P(String.prototype.trim), vi = P(Number.prototype.toString), Ai = P(Boolean.prototype.toString), Ar = typeof BigInt > "u" ? null : P(BigInt.prototype.toString), Tr = typeof Symbol > "u" ? null : P(Symbol.prototype.toString), q = P(Object.prototype.hasOwnProperty), Ke = P(Object.prototype.toString), M = P(RegExp.prototype.test), ke = Ti(TypeError);
function P(t) {
  return function(e) {
    e instanceof RegExp && (e.lastIndex = 0);
    for (var n = arguments.length, s = new Array(n > 1 ? n - 1 : 0), r = 1; r < n; r++)
      s[r - 1] = arguments[r];
    return sn(t, e, s);
  };
}
function Ti(t) {
  return function() {
    for (var e = arguments.length, n = new Array(e), s = 0; s < e; s++)
      n[s] = arguments[s];
    return an(t, n);
  };
}
function k(t, e) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : et;
  if (kr && kr(t, null), !He(e))
    return t;
  let s = e.length;
  for (; s--; ) {
    let r = e[s];
    if (typeof r == "string") {
      const o = n(r);
      o !== r && (bi(e) || (e[s] = o), r = o);
    }
    t[r] = !0;
  }
  return t;
}
function Si(t) {
  for (let e = 0; e < t.length; e++)
    q(t, e) || (t[e] = null);
  return t;
}
function Y(t) {
  const e = ze(null);
  for (const s of Zr(t)) {
    var n = gi(s, 2);
    const r = n[0], o = n[1];
    q(t, r) && (He(o) ? e[r] = Si(o) : o && typeof o == "object" && o.constructor === Object ? e[r] = Y(o) : e[r] = o);
  }
  return e;
}
function Ei(t) {
  switch (typeof t) {
    case "string":
      return t;
    case "number":
      return vi(t);
    case "boolean":
      return Ai(t);
    case "bigint":
      return Ar ? Ar(t) : "0";
    case "symbol":
      return Tr ? Tr(t) : "Symbol()";
    case "undefined":
      return Ke(t);
    case "function":
    case "object": {
      if (t === null)
        return Ke(t);
      const e = t, n = X(e, "toString");
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
function X(t, e) {
  for (; t !== null; ) {
    const s = xi(t, e);
    if (s) {
      if (s.get)
        return P(s.get);
      if (typeof s.value == "function")
        return P(s.value);
    }
    t = yi(t);
  }
  function n() {
    return null;
  }
  return n;
}
function $i(t) {
  try {
    return M(t, ""), !0;
  } catch {
    return !1;
  }
}
const Sr = I(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), Qt = I(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), Jt = I(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), Ri = I(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), en = I(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), Oi = I(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), Er = I(["#text"]), $r = I(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "command", "commandfor", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns"]), tn = I(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dominant-baseline", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "pointer-events", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-orientation", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "vector-effect", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), Rr = I(["accent", "accentunder", "align", "bevelled", "close", "columnalign", "columnlines", "columnspacing", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lquote", "lspace", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), kt = I(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), Ci = L(/{{[\w\W]*|^[\w\W]*}}/g), Pi = L(/<%[\w\W]*|^[\w\W]*%>/g), Ii = L(/\${[\w\W]*/g), Li = L(/^data-[\-\w.\u00B7-\uFFFF]+$/), Di = L(/^aria-[\-\w]+$/), Or = L(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), Mi = L(/^(?:\w+script|data):/i), Ni = L(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), zi = L(/^html$/i), Ui = L(/^[a-z][.\w]*(-[.\w]+)+$/i), Cr = L(/<[/\w!]/g), Pr = L(/<[/\w]/g), Hi = L(/<\/no(script|embed|frames)/i), Bi = L(/\/>/i), G = {
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
}, Xr = ["style", "script", "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript"], Fi = I(k({}, Xr)), qi = (function() {
  const t = {};
  return _e(Xr, (e) => {
    t[e] = L(new RegExp("</" + e + "(?=[\\t\\n\\f\\r />])", "i"));
  }), I(t);
})(), ji = function() {
  return typeof window > "u" ? null : window;
}, Wi = function(e, n) {
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
}, Ir = function() {
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
}, he = function(e, n, s, r) {
  return q(e, n) && He(e[n]) ? k(r.base ? Y(r.base) : {}, e[n], r.transform) : s;
}, nn = function(e, n, s) {
  const r = q(e, n) ? e[n] : void 0;
  return r && typeof r == "object" ? Y(r) : s();
};
function Kr() {
  let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ji();
  const e = (h) => Kr(h);
  if (e.version = "3.4.14", e.removed = [], !t || !t.document || t.document.nodeType !== G.document || !t.Element)
    return e.isSupported = !1, e;
  let n = t.document;
  const s = n, r = s.currentScript;
  t.DocumentFragment;
  const o = t.HTMLTemplateElement, a = t.Node, p = t.Element, c = t.NodeFilter, g = t.NamedNodeMap;
  g === void 0 && (t.NamedNodeMap || t.MozNamedAttrMap), t.HTMLFormElement;
  const d = t.DOMParser, b = t.trustedTypes, y = p.prototype, A = X(y, "cloneNode"), w = X(y, "remove"), U = X(y, "nextSibling"), ie = X(y, "childNodes"), J = X(y, "parentNode"), qe = X(y, "shadowRoot"), Re = X(y, "attributes"), ee = a && a.prototype ? X(a.prototype, "nodeType") : null, oe = a && a.prototype ? X(a.prototype, "nodeName") : null, le = a && a.prototype ? X(a.prototype, "ownerDocument") : null, V = function(i) {
    return ee ? ee(i) : i.nodeType;
  }, Pt = function(i) {
    return oe ? oe(i) : i.nodeName;
  };
  if (typeof o == "function") {
    const h = n.createElement("template");
    h.content && h.content.ownerDocument && (n = h.content.ownerDocument);
  }
  let H, ge = "", It, On = !1, je = 0;
  const Cn = function() {
    if (je > 0)
      throw ke('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  }, Oe = function(i) {
    Cn(), je++;
    try {
      return H.createHTML(i);
    } finally {
      je--;
    }
  }, fs = function(i) {
    Cn(), je++;
    try {
      return H.createScriptURL(i);
    } finally {
      je--;
    }
  }, gs = function() {
    return On || (It = Wi(b, r), On = !0), It;
  }, ot = n, Lt = ot.implementation, Pn = ot.createNodeIterator, ms = ot.createDocumentFragment, bs = ot.getElementsByTagName, ys = s.importNode;
  let S = Ir();
  e.isSupported = typeof Zr == "function" && typeof J == "function" && Lt && Lt.createHTMLDocument !== void 0;
  const xs = Ci, ks = Pi, _s = Ii, ws = Li, vs = Di, As = Mi, In = Ni, Ts = Ui;
  let Ln = Or, E = null;
  const Dt = k({}, [...Sr, ...Qt, ...Jt, ...en, ...Er]);
  let $ = null;
  const Mt = k({}, [...$r, ...tn, ...Rr, ...kt]);
  let te = Object.seal(ze(null, {
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
  })), We = null, Dn = null;
  const ce = Object.seal(ze(null, {
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
  let Mn = !0, Nt = !0, Nn = !1, zn = !0, pe = !1, me = !0, be = !1, zt = !1, lt = null, ct = null, Ut = !1, Ce = !1, pt = !1, ut = !1, Un = !0, Hn = !1;
  const Bn = "user-content-";
  let Ht = !0, Bt = !1, Pe = {}, Ie = null;
  const Fn = k({}, [
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
  let qn = null;
  const jn = k({}, ["audio", "video", "img", "source", "image", "track"]);
  let Wn = null;
  const Gn = k({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), ht = "http://www.w3.org/1998/Math/MathML", dt = "http://www.w3.org/2000/svg", ne = "http://www.w3.org/1999/xhtml";
  let Le = ne, Ft = !1, qt = null;
  const Ss = k({}, [ht, dt, ne], Kt), Yn = I(["mi", "mo", "mn", "ms", "mtext"]);
  let jt = k({}, Yn);
  const Zn = I(["annotation-xml"]);
  let Wt = k({}, Zn);
  const Es = k({}, ["title", "style", "font", "a", "script"]);
  let Ge = null;
  const $s = ["application/xhtml+xml", "text/html"], Rs = "text/html";
  let C = null, De = null;
  const Os = n.createElement("form"), Vn = function(i) {
    return i instanceof RegExp || i instanceof Function;
  }, Gt = function() {
    let i = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (De && De === i)
      return;
    (!i || typeof i != "object") && (i = {}), i = Y(i), Ge = // eslint-disable-next-line unicorn/prefer-includes
    $s.indexOf(i.PARSER_MEDIA_TYPE) === -1 ? Rs : i.PARSER_MEDIA_TYPE, C = Ge === "application/xhtml+xml" ? Kt : et, E = he(i, "ALLOWED_TAGS", Dt, {
      transform: C
    }), $ = he(i, "ALLOWED_ATTR", Mt, {
      transform: C
    }), qt = he(i, "ALLOWED_NAMESPACES", Ss, {
      transform: Kt
    }), Wn = he(i, "ADD_URI_SAFE_ATTR", Gn, {
      transform: C,
      base: Gn
    }), qn = he(i, "ADD_DATA_URI_TAGS", jn, {
      transform: C,
      base: jn
    }), Ie = he(i, "FORBID_CONTENTS", Fn, {
      transform: C
    }), We = he(i, "FORBID_TAGS", Y({}), {
      transform: C
    }), Dn = he(i, "FORBID_ATTR", Y({}), {
      transform: C
    }), Pe = q(i, "USE_PROFILES") ? i.USE_PROFILES && typeof i.USE_PROFILES == "object" ? Y(i.USE_PROFILES) : i.USE_PROFILES : !1, Mn = i.ALLOW_ARIA_ATTR !== !1, Nt = i.ALLOW_DATA_ATTR !== !1, Nn = i.ALLOW_UNKNOWN_PROTOCOLS || !1, zn = i.ALLOW_SELF_CLOSE_IN_ATTR !== !1, pe = i.SAFE_FOR_TEMPLATES || !1, me = i.SAFE_FOR_XML !== !1, be = i.WHOLE_DOCUMENT || !1, Ce = i.RETURN_DOM || !1, pt = i.RETURN_DOM_FRAGMENT || !1, ut = i.RETURN_TRUSTED_TYPE || !1, Ut = i.FORCE_BODY || !1, Un = i.SANITIZE_DOM !== !1, Hn = i.SANITIZE_NAMED_PROPS || !1, Ht = i.KEEP_CONTENT !== !1, Bt = i.IN_PLACE || !1, Ln = $i(i.ALLOWED_URI_REGEXP) ? i.ALLOWED_URI_REGEXP : Or, Le = typeof i.NAMESPACE == "string" ? i.NAMESPACE : ne, jt = nn(
      i,
      "MATHML_TEXT_INTEGRATION_POINTS",
      () => k({}, Yn)
      // Default built-in map
    ), Wt = nn(
      i,
      "HTML_INTEGRATION_POINTS",
      () => k({}, Zn)
      // Default built-in map
    );
    const l = nn(i, "CUSTOM_ELEMENT_HANDLING", () => ze(null));
    if (te = ze(null), q(l, "tagNameCheck") && Vn(l.tagNameCheck) && (te.tagNameCheck = l.tagNameCheck), q(l, "attributeNameCheck") && Vn(l.attributeNameCheck) && (te.attributeNameCheck = l.attributeNameCheck), q(l, "allowCustomizedBuiltInElements") && typeof l.allowCustomizedBuiltInElements == "boolean" && (te.allowCustomizedBuiltInElements = l.allowCustomizedBuiltInElements), L(te), pe && (Nt = !1), pt && (Ce = !0), Pe && (E = k({}, Er), $ = ze(null), Pe.html === !0 && (k(E, Sr), k($, $r)), Pe.svg === !0 && (k(E, Qt), k($, tn), k($, kt)), Pe.svgFilters === !0 && (k(E, Jt), k($, tn), k($, kt)), Pe.mathMl === !0 && (k(E, en), k($, Rr), k($, kt))), ce.tagCheck = null, ce.attributeCheck = null, q(i, "ADD_TAGS") && (typeof i.ADD_TAGS == "function" ? ce.tagCheck = i.ADD_TAGS : He(i.ADD_TAGS) && (E === Dt && (E = Y(E)), k(E, i.ADD_TAGS, C))), q(i, "ADD_ATTR") && (typeof i.ADD_ATTR == "function" ? ce.attributeCheck = i.ADD_ATTR : He(i.ADD_ATTR) && ($ === Mt && ($ = Y($)), k($, i.ADD_ATTR, C))), q(i, "ADD_FORBID_CONTENTS") && He(i.ADD_FORBID_CONTENTS) && (Ie === Fn && (Ie = Y(Ie)), k(Ie, i.ADD_FORBID_CONTENTS, C)), Ht && (E["#text"] = !0), be && k(E, ["html", "head", "body"]), E.table && (k(E, ["tbody"]), delete We.tbody), i.TRUSTED_TYPES_POLICY) {
      if (typeof i.TRUSTED_TYPES_POLICY.createHTML != "function")
        throw ke('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof i.TRUSTED_TYPES_POLICY.createScriptURL != "function")
        throw ke('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const u = H;
      H = i.TRUSTED_TYPES_POLICY;
      try {
        ge = Oe("");
      } catch (f) {
        throw H = u, f;
      }
    } else i.TRUSTED_TYPES_POLICY === null ? (H = void 0, ge = "") : (H === void 0 && (H = gs()), H && typeof ge == "string" && (ge = Oe("")));
    I && I(i), De = i;
  }, Xn = k({}, [...Qt, ...Jt, ...Ri]), Kn = k({}, [...en, ...Oi]), Cs = function(i, l, u) {
    return l.namespaceURI === ne ? i === "svg" : l.namespaceURI === ht ? i === "svg" && (u === "annotation-xml" || jt[u]) : !!Xn[i];
  }, Ps = function(i, l, u) {
    return l.namespaceURI === ne ? i === "math" : l.namespaceURI === dt ? i === "math" && Wt[u] : !!Kn[i];
  }, Is = function(i, l, u) {
    return l.namespaceURI === dt && !Wt[u] || l.namespaceURI === ht && !jt[u] ? !1 : !Kn[i] && (Es[i] || !Xn[i]);
  }, Ls = function(i) {
    let l = J(i);
    (!l || !l.tagName) && (l = {
      namespaceURI: Le,
      tagName: "template"
    });
    const u = et(i.tagName), f = et(l.tagName);
    return qt[i.namespaceURI] ? i.namespaceURI === dt ? Cs(u, l, f) : i.namespaceURI === ht ? Ps(u, l, f) : i.namespaceURI === ne ? Is(u, l, f) : !!(Ge === "application/xhtml+xml" && qt[i.namespaceURI]) : !1;
  }, ue = function(i) {
    Ve(e.removed, {
      element: i
    });
    try {
      J(i).removeChild(i);
    } catch {
      if (w(i), !J(i))
        throw ke("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  }, Qn = function(i, l, u) {
    try {
      i.removeAttributeNode(l);
    } catch {
      try {
        i.removeAttribute(u);
      } catch {
      }
    }
  }, ft = function(i) {
    gt(i);
    const l = ie(i);
    if (l) {
      const f = [];
      _e(l, (m) => {
        Ve(f, m);
      }), _e(f, (m) => {
        try {
          w(m);
        } catch {
        }
      });
    }
    const u = Re(i);
    if (u)
      for (let f = u.length - 1; f >= 0; --f) {
        const m = u[f], x = m && m.name;
        typeof x == "string" && Qn(i, m, x);
      }
  }, ye = function(i, l, u) {
    if (!u)
      try {
        u = l.getAttributeNode(i);
      } catch {
        u = null;
      }
    Ve(e.removed, {
      attribute: u || null,
      from: l
    });
    try {
      u ? l.removeAttributeNode(u) : l.removeAttribute(i);
    } catch {
      try {
        l.removeAttribute(i);
      } catch {
      }
    }
    if (i === "is")
      if (Ce || pt)
        try {
          ue(l);
        } catch {
        }
      else
        try {
          l.setAttribute(i, "");
        } catch {
        }
  }, Ds = function(i) {
    const l = Re(i);
    if (l)
      for (let u = l.length - 1; u >= 0; --u) {
        const f = l[u], m = f && f.name;
        typeof m != "string" || $[C(m)] || Qn(i, f, m);
      }
  }, gt = function(i) {
    const l = [i];
    for (; l.length > 0; ) {
      const u = l.pop();
      V(u) === G.element && Ds(u);
      const m = ie(u);
      if (m)
        for (let x = m.length - 1; x >= 0; --x)
          l.push(m[x]);
    }
  }, Jn = function(i, l) {
    return me ? i === "patchsrc" ? !0 : i === "for" && l !== "label" && l !== "output" : !1;
  }, Ms = function(i) {
    if (!me)
      return;
    const l = [i];
    for (; l.length > 0; ) {
      const u = l.pop(), f = V(u);
      if (f === G.processingInstruction || f === G.comment && M(Pr, u.data)) {
        try {
          w(u);
        } catch {
        }
        continue;
      }
      if (f === G.element) {
        const x = u, T = C(Pt(u));
        try {
          x.hasAttribute && x.hasAttribute("patchsrc") && x.removeAttribute("patchsrc"), x.hasAttribute && x.hasAttribute("for") && Jn("for", T) && x.removeAttribute("for");
        } catch {
        }
      }
      const m = ie(u);
      if (m)
        for (let x = m.length - 1; x >= 0; --x)
          l.push(m[x]);
    }
  }, er = function(i) {
    let l = null, u = null;
    if (Ut)
      i = "<remove></remove>" + i;
    else {
      const x = wr(i, /^[\r\n\t ]+/);
      u = x && x[0];
    }
    Ge === "application/xhtml+xml" && Le === ne && (i = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + i + "</body></html>");
    const f = H ? Oe(i) : i;
    if (Le === ne)
      try {
        l = new d().parseFromString(f, Ge);
      } catch {
      }
    if (!l || !l.documentElement) {
      l = Lt.createDocument(Le, "template", null);
      try {
        l.documentElement.innerHTML = Ft ? ge : f;
      } catch {
      }
    }
    const m = l.body || l.documentElement;
    return i && u && m.insertBefore(n.createTextNode(u), m.childNodes[0] || null), Le === ne ? bs.call(l, be ? "html" : "body")[0] : be ? l.documentElement : m;
  }, tr = function(i) {
    const l = le ? le(i) : i.ownerDocument;
    return Pn.call(
      l || i,
      i,
      // eslint-disable-next-line no-bitwise
      c.SHOW_ELEMENT | c.SHOW_COMMENT | c.SHOW_TEXT | c.SHOW_PROCESSING_INSTRUCTION | c.SHOW_CDATA_SECTION,
      null
    );
  }, mt = function(i) {
    return i = Xe(i, xs, " "), i = Xe(i, ks, " "), i = Xe(i, _s, " "), i;
  }, Yt = function(i) {
    var l;
    i.normalize();
    const u = le ? le(i) : i.ownerDocument, f = Pn.call(
      u || i,
      i,
      // eslint-disable-next-line no-bitwise
      c.SHOW_TEXT | c.SHOW_COMMENT | c.SHOW_CDATA_SECTION | c.SHOW_PROCESSING_INSTRUCTION,
      null
    );
    let m = f.nextNode();
    for (; m; )
      m.data = mt(m.data), m = f.nextNode();
    const x = (l = i.querySelectorAll) === null || l === void 0 ? void 0 : l.call(i, "template");
    x && _e(x, (T) => {
      Me(T.content) && Yt(T.content);
    });
  }, bt = function(i) {
    const l = oe ? oe(i) : null;
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
    i.nodeType !== ee(i) || // HTMLFormElement has [LegacyOverrideBuiltIns]: a descendant named
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
    i.childNodes !== ie(i);
  }, Me = function(i) {
    if (!ee || typeof i != "object" || i === null)
      return !1;
    try {
      return ee(i) === G.documentFragment;
    } catch {
      return !1;
    }
  }, Ye = function(i) {
    if (!ee || typeof i != "object" || i === null)
      return !1;
    try {
      return typeof ee(i) == "number";
    } catch {
      return !1;
    }
  };
  function re(h, i, l) {
    h.length !== 0 && _e(h, (u) => {
      u.call(e, i, l, De);
    });
  }
  const Ns = function(i, l) {
    return !!(me && i.hasChildNodes() && !Ye(i.firstElementChild) && M(Cr, i.textContent) && M(Cr, i.innerHTML) || me && i.namespaceURI === ne && Fi[l] && (Ye(i.firstElementChild) || typeof i.textContent == "string" && M(qi[l], i.textContent)) || i.nodeType === G.processingInstruction || me && i.nodeType === G.comment && M(Pr, i.data));
  }, yt = function(i, l) {
    if (i instanceof RegExp)
      return M(i, l);
    if (i instanceof Function) {
      for (var u = arguments.length, f = new Array(u > 2 ? u - 2 : 0), m = 2; m < u; m++)
        f[m - 2] = arguments[m];
      return !!i(l, ...f);
    }
    return !1;
  }, zs = function(i, l, u) {
    if (!We[l] && ar(l) && yt(te.tagNameCheck, l))
      return !1;
    if (Ht && !Ie[l]) {
      const f = J(i), m = ie(i);
      if (m && f) {
        const x = m.length;
        for (let T = x - 1; T >= 0; --T) {
          const O = i === u ? A(m[T], !0) : m[T];
          f.insertBefore(O, U(i));
        }
      }
    }
    return ue(i), !0;
  }, nr = function(i, l, u, f) {
    return i.length === 0 ? l : l === u || l === f ? Y(l) : l;
  }, rr = function(i, l) {
    return i === l || J(i) !== null ? !1 : (Bt && gt(i), !0);
  }, sr = function(i, l) {
    if (re(S.beforeSanitizeElements, i, null), rr(i, l))
      return !0;
    if (bt(i))
      return ue(i), !0;
    const u = C(Pt(i));
    if (E = nr(S.uponSanitizeElement, E, Dt, lt), re(S.uponSanitizeElement, i, {
      tagName: u,
      allowedTags: E
    }), rr(i, l))
      return !0;
    if (Ns(i, u))
      return ue(i), !0;
    if (We[u] || !(ce.tagCheck instanceof Function && ce.tagCheck(u)) && !E[u]) {
      const m = zs(i, u, l);
      return m === !1 && re(S.afterSanitizeElements, i, null), m;
    }
    if (V(i) === G.element && !Ls(i) || (u === "noscript" || u === "noembed" || u === "noframes") && M(Hi, i.innerHTML))
      return ue(i), !0;
    if (pe && i.nodeType === G.text) {
      const m = mt(i.textContent);
      i.textContent !== m && (Ve(e.removed, {
        element: i.cloneNode()
      }), i.textContent = m);
    }
    return re(S.afterSanitizeElements, i, null), !1;
  }, ir = function(i, l, u) {
    if (Dn[l] || Jn(l, i) || Un && (l === "id" || l === "name") && (u in n || u in Os))
      return !1;
    const f = $[l] || ce.attributeCheck instanceof Function && ce.attributeCheck(l, i);
    return Nt && M(ws, l) || Mn && M(vs, l) ? !0 : f ? Wn[l] || M(Ln, Xe(u, In, "")) || (l === "src" || l === "xlink:href" || l === "href") && i !== "script" && vr(u, "data:") === 0 && qn[i] || Nn && !M(As, Xe(u, In, "")) ? !0 : !u : (
      // Condition a) covers a basically valid custom element tag name whose
      // tag passes the configured tagNameCheck and whose attribute name
      // passes the configured attributeNameCheck ...
      ar(i) && yt(te.tagNameCheck, i) && yt(te.attributeNameCheck, l, i) || // Condition b) covers an `is` attribute whose value passes the
      // configured tagNameCheck while customized built-in elements are
      // allowed.
      l === "is" && te.allowCustomizedBuiltInElements && yt(te.tagNameCheck, u)
    );
  }, Us = k({}, ["annotation-xml", "color-profile", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "missing-glyph"]), ar = function(i) {
    return !Us[et(i)] && M(Ts, i);
  }, Hs = function(i, l, u, f) {
    if (H && typeof b == "object" && typeof b.getAttributeType == "function" && !u)
      switch (b.getAttributeType(i, l)) {
        case "TrustedHTML":
          return Oe(f);
        case "TrustedScriptURL":
          return fs(f);
      }
    return f;
  }, Bs = function(i, l, u, f) {
    try {
      u ? i.setAttributeNS(u, l, f) : i.setAttribute(l, f), bt(i) ? ue(i) : _r(e.removed);
    } catch {
      ye(l, i);
    }
  }, or = function(i) {
    re(S.beforeSanitizeAttributes, i, null);
    const l = i.attributes;
    if (!l || bt(i))
      return;
    $ = nr(S.uponSanitizeAttribute, $, Mt, ct);
    const u = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: $,
      forceKeepAttr: void 0
    };
    let f = l.length;
    const m = C(i.nodeName);
    for (; f--; ) {
      const x = l[f], T = x.name, O = x.namespaceURI, B = x.value, F = C(T), Vt = B;
      let N = T === "value" ? Vt : wi(Vt);
      if (u.attrName = F, u.attrValue = N, u.keepAttr = !0, u.forceKeepAttr = void 0, re(S.uponSanitizeAttribute, i, u), N = u.attrValue, Hn && (F === "id" || F === "name") && vr(N, Bn) !== 0 && (ye(T, i, x), N = Bn + N), me && M(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, N)) {
        ye(T, i, x);
        continue;
      }
      if (F === "attributename" && wr(N, "href")) {
        ye(T, i, x);
        continue;
      }
      if (!u.forceKeepAttr) {
        if (!u.keepAttr) {
          ye(T, i, x);
          continue;
        }
        if (!zn && M(Bi, N)) {
          ye(T, i, x);
          continue;
        }
        if (pe && (N = mt(N)), !ir(m, F, N)) {
          ye(T, i, x);
          continue;
        }
        N = Hs(m, F, O, N), N !== Vt && Bs(i, T, O, N);
      }
    }
    re(S.afterSanitizeAttributes, i, null);
  }, xt = function(i) {
    let l = null;
    const u = tr(i);
    for (re(S.beforeSanitizeShadowDOM, i, null); l = u.nextNode(); )
      if (re(S.uponSanitizeShadowNode, l, null), sr(l, i), or(l), Me(l.content) && xt(l.content), V(l) === G.element) {
        const f = qe(l);
        Me(f) && (Zt(f), xt(f));
      }
    re(S.afterSanitizeShadowDOM, i, null);
  }, Zt = function(i) {
    const l = [{
      node: i,
      shadow: null
    }];
    for (; l.length > 0; ) {
      const u = l.pop();
      if (u.shadow) {
        xt(u.shadow);
        continue;
      }
      const f = u.node, x = V(f) === G.element, T = ie(f);
      if (T)
        for (let O = T.length - 1; O >= 0; --O)
          l.push({
            node: T[O],
            shadow: null
          });
      if (x) {
        const O = oe ? oe(f) : null;
        if (typeof O == "string" && C(O) === "template") {
          const B = f.content;
          Me(B) && l.push({
            node: B,
            shadow: null
          });
        }
      }
      if (x) {
        const O = qe(f);
        Me(O) && l.push({
          node: null,
          shadow: O
        }, {
          node: O,
          shadow: null
        });
      }
    }
  };
  return e.sanitize = function(h) {
    let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, l = null, u = null, f = null, m = null;
    if (Ft = !h, Ft && (h = "<!-->"), typeof h != "string" && !Ye(h) && (h = Ei(h), typeof h != "string"))
      throw ke("dirty is not a string, aborting");
    if (!e.isSupported)
      return h;
    zt ? (E = lt, $ = ct) : Gt(i), (S.uponSanitizeElement.length > 0 || S.uponSanitizeAttribute.length > 0) && (E = Y(E)), S.uponSanitizeAttribute.length > 0 && ($ = Y($)), e.removed = [];
    const x = Bt && typeof h != "string" && Ye(h);
    if (x) {
      Ms(h);
      const B = Pt(h);
      if (typeof B == "string") {
        const F = C(B);
        if (!E[F] || We[F])
          throw ft(h), ke("root node is forbidden and cannot be sanitized in-place");
      }
      if (bt(h))
        throw ft(h), ke("root node is clobbered and cannot be sanitized in-place");
      try {
        Zt(h);
      } catch (F) {
        throw ft(h), F;
      }
    } else if (Ye(h))
      l = er("<!---->"), u = l.ownerDocument.importNode(h, !0), u.nodeType === G.element && u.nodeName === "BODY" || u.nodeName === "HTML" ? l = u : l.appendChild(u), Zt(u);
    else {
      if (!Ce && !pe && !be && // eslint-disable-next-line unicorn/prefer-includes
      h.indexOf("<") === -1)
        return H && ut ? Oe(h) : h;
      if (l = er(h), !l)
        return Ce ? null : ut ? ge : "";
    }
    l && Ut && ue(l.firstChild);
    const T = x ? h : l;
    try {
      const B = tr(T);
      for (; f = B.nextNode(); )
        sr(f, T), or(f), Me(f.content) && xt(f.content);
    } catch (B) {
      throw x && (ft(h), _e(e.removed, (F) => {
        F.element && gt(F.element);
      })), B;
    }
    if (x)
      return _e(e.removed, (B) => {
        B.element && gt(B.element);
      }), pe && Yt(h), h;
    if (Ce) {
      if (pe && Yt(l), pt)
        for (m = ms.call(l.ownerDocument); l.firstChild; )
          m.appendChild(l.firstChild);
      else
        m = l;
      return ($.shadowroot || $.shadowrootmode) && (m = ys.call(s, m, !0)), m;
    }
    let O = be ? l.outerHTML : l.innerHTML;
    return be && E["!doctype"] && l.ownerDocument && l.ownerDocument.doctype && l.ownerDocument.doctype.name && M(zi, l.ownerDocument.doctype.name) && (O = "<!DOCTYPE " + l.ownerDocument.doctype.name + `>
` + O), pe && (O = mt(O)), H && ut ? Oe(O) : O;
  }, e.setConfig = function() {
    let h = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Gt(h), zt = !0, lt = E, ct = $;
  }, e.clearConfig = function() {
    De = null, zt = !1, lt = null, ct = null, H = It, ge = "";
  }, e.isValidAttribute = function(h, i, l) {
    De || Gt({});
    const u = C(h), f = C(i);
    return ir(u, f, l);
  }, e.addHook = function(h, i) {
    typeof i == "function" && q(S, h) && Ve(S[h], i);
  }, e.removeHook = function(h, i) {
    if (q(S, h)) {
      if (i !== void 0) {
        const l = ki(S[h], i);
        return l === -1 ? void 0 : _i(S[h], l, 1)[0];
      }
      return _r(S[h]);
    }
  }, e.removeHooks = function(h) {
    q(S, h) && (S[h] = []);
  }, e.removeAllHooks = function() {
    S = Ir();
  }, e;
}
var Gi = Kr();
function kn() {
  return { async: !1, breaks: !1, extensions: null, gfm: !0, hooks: null, pedantic: !1, renderer: null, silent: !1, tokenizer: null, walkTokens: null };
}
var $e = kn();
function Qr(t) {
  $e = t;
}
var rt = { exec: () => null };
function _(t, e = "") {
  let n = typeof t == "string" ? t : t.source, s = { replace: (r, o) => {
    let a = typeof o == "string" ? o : o.source;
    return a = a.replace(z.caret, "$1"), n = n.replace(r, a), s;
  }, getRegex: () => new RegExp(n, e) };
  return s;
}
var Yi = (() => {
  try {
    return !!new RegExp("(?<=1)(?<!1)");
  } catch {
    return !1;
  }
})(), z = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (t) => new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}#`), htmlBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}<(?:[a-z].*>|!--)`, "i") }, Zi = /^(?:[ \t]*(?:\n|$))+/, Vi = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, Xi = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, at = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, Ki = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, _n = /(?:[*+-]|\d{1,9}[.)])/, Jr = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, es = _(Jr).replace(/bull/g, _n).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), Qi = _(Jr).replace(/bull/g, _n).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), wn = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, Ji = /^[^\n]+/, vn = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, ea = _(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", vn).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), ta = _(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, _n).getRegex(), Ot = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", An = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, na = _("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", An).replace("tag", Ot).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), ts = _(wn).replace("hr", at).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex(), ra = _(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ts).getRegex(), Tn = { blockquote: ra, code: Vi, def: ea, fences: Xi, heading: Ki, hr: at, html: na, lheading: es, list: ta, newline: Zi, paragraph: ts, table: rt, text: Ji }, Lr = _("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", at).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex(), sa = { ...Tn, lheading: Qi, table: Lr, paragraph: _(wn).replace("hr", at).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", Lr).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Ot).getRegex() }, ia = { ...Tn, html: _(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", An).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: rt, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: _(wn).replace("hr", at).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", es).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, aa = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, oa = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, ns = /^( {2,}|\\)\n(?!\s*$)/, la = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, Ct = /[\p{P}\p{S}]/u, Sn = /[\s\p{P}\p{S}]/u, rs = /[^\s\p{P}\p{S}]/u, ca = _(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, Sn).getRegex(), ss = /(?!~)[\p{P}\p{S}]/u, pa = /(?!~)[\s\p{P}\p{S}]/u, ua = /(?:[^\s\p{P}\p{S}]|~)/u, ha = _(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Yi ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), is = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, da = _(is, "u").replace(/punct/g, Ct).getRegex(), fa = _(is, "u").replace(/punct/g, ss).getRegex(), as = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", ga = _(as, "gu").replace(/notPunctSpace/g, rs).replace(/punctSpace/g, Sn).replace(/punct/g, Ct).getRegex(), ma = _(as, "gu").replace(/notPunctSpace/g, ua).replace(/punctSpace/g, pa).replace(/punct/g, ss).getRegex(), ba = _("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, rs).replace(/punctSpace/g, Sn).replace(/punct/g, Ct).getRegex(), ya = _(/\\(punct)/, "gu").replace(/punct/g, Ct).getRegex(), xa = _(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), ka = _(An).replace("(?:-->|$)", "-->").getRegex(), _a = _("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ka).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), Tt = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/, wa = _(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", Tt).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), os = _(/^!?\[(label)\]\[(ref)\]/).replace("label", Tt).replace("ref", vn).getRegex(), ls = _(/^!?\[(ref)\](?:\[\])?/).replace("ref", vn).getRegex(), va = _("reflink|nolink(?!\\()", "g").replace("reflink", os).replace("nolink", ls).getRegex(), Dr = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, En = { _backpedal: rt, anyPunctuation: ya, autolink: xa, blockSkip: ha, br: ns, code: oa, del: rt, emStrongLDelim: da, emStrongRDelimAst: ga, emStrongRDelimUnd: ba, escape: aa, link: wa, nolink: ls, punctuation: ca, reflink: os, reflinkSearch: va, tag: _a, text: la, url: rt }, Aa = { ...En, link: _(/^!?\[(label)\]\((.*?)\)/).replace("label", Tt).getRegex(), reflink: _(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", Tt).getRegex() }, on = { ...En, emStrongRDelimAst: ma, emStrongLDelim: fa, url: _(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", Dr).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: _(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", Dr).getRegex() }, Ta = { ...on, br: _(ns).replace("{2,}", "*").getRegex(), text: _(on.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, _t = { normal: Tn, gfm: sa, pedantic: ia }, Qe = { normal: En, gfm: on, breaks: Ta, pedantic: Aa }, Sa = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, Mr = (t) => Sa[t];
function se(t, e) {
  if (e) {
    if (z.escapeTest.test(t)) return t.replace(z.escapeReplace, Mr);
  } else if (z.escapeTestNoEncode.test(t)) return t.replace(z.escapeReplaceNoEncode, Mr);
  return t;
}
function Nr(t) {
  try {
    t = encodeURI(t).replace(z.percentDecode, "%");
  } catch {
    return null;
  }
  return t;
}
function zr(t, e) {
  let n = t.replace(z.findPipe, (o, a, p) => {
    let c = !1, g = a;
    for (; --g >= 0 && p[g] === "\\"; ) c = !c;
    return c ? "|" : " |";
  }), s = n.split(z.splitPipe), r = 0;
  if (s[0].trim() || s.shift(), s.length > 0 && !s.at(-1)?.trim() && s.pop(), e) if (s.length > e) s.splice(e);
  else for (; s.length < e; ) s.push("");
  for (; r < s.length; r++) s[r] = s[r].trim().replace(z.slashPipe, "|");
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
function Ea(t, e) {
  if (t.indexOf(e[1]) === -1) return -1;
  let n = 0;
  for (let s = 0; s < t.length; s++) if (t[s] === "\\") s++;
  else if (t[s] === e[0]) n++;
  else if (t[s] === e[1] && (n--, n < 0)) return s;
  return n > 0 ? -2 : -1;
}
function Ur(t, e, n, s, r) {
  let o = e.href, a = e.title || null, p = t[1].replace(r.other.outputLinkReplace, "$1");
  s.state.inLink = !0;
  let c = { type: t[0].charAt(0) === "!" ? "image" : "link", raw: n, href: o, title: a, text: p, tokens: s.inlineTokens(p) };
  return s.state.inLink = !1, c;
}
function $a(t, e, n) {
  let s = t.match(n.other.indentCodeCompensation);
  if (s === null) return e;
  let r = s[1];
  return e.split(`
`).map((o) => {
    let a = o.match(n.other.beginningSpace);
    if (a === null) return o;
    let [p] = a;
    return p.length >= r.length ? o.slice(r.length) : o;
  }).join(`
`);
}
var St = class {
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
      let n = e[0], s = $a(n, e[3] || "", this.rules);
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
        let a = !1, p = [], c;
        for (c = 0; c < n.length; c++) if (this.rules.other.blockquoteStart.test(n[c])) p.push(n[c]), a = !0;
        else if (!a) p.push(n[c]);
        else break;
        n = n.slice(c);
        let g = p.join(`
`), d = g.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${g}` : g, r = r ? `${r}
${d}` : d;
        let b = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(d, o, !0), this.lexer.state.top = b, n.length === 0) break;
        let y = o.at(-1);
        if (y?.type === "code") break;
        if (y?.type === "blockquote") {
          let A = y, w = A.raw + `
` + n.join(`
`), U = this.blockquote(w);
          o[o.length - 1] = U, s = s.substring(0, s.length - A.raw.length) + U.raw, r = r.substring(0, r.length - A.text.length) + U.text;
          break;
        } else if (y?.type === "list") {
          let A = y, w = A.raw + `
` + n.join(`
`), U = this.list(w);
          o[o.length - 1] = U, s = s.substring(0, s.length - y.raw.length) + U.raw, r = r.substring(0, r.length - A.raw.length) + U.raw, n = w.substring(o.at(-1).raw.length).split(`
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
        let b = e[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (J) => " ".repeat(3 * J.length)), y = t.split(`
`, 1)[0], A = !b.trim(), w = 0;
        if (this.options.pedantic ? (w = 2, d = b.trimStart()) : A ? w = e[1].length + 1 : (w = e[2].search(this.rules.other.nonSpaceChar), w = w > 4 ? 1 : w, d = b.slice(w), w += e[1].length), A && this.rules.other.blankLine.test(y) && (g += y + `
`, t = t.substring(y.length + 1), c = !0), !c) {
          let J = this.rules.other.nextBulletRegex(w), qe = this.rules.other.hrRegex(w), Re = this.rules.other.fencesBeginRegex(w), ee = this.rules.other.headingBeginRegex(w), oe = this.rules.other.htmlBeginRegex(w);
          for (; t; ) {
            let le = t.split(`
`, 1)[0], V;
            if (y = le, this.options.pedantic ? (y = y.replace(this.rules.other.listReplaceNesting, "  "), V = y) : V = y.replace(this.rules.other.tabCharGlobal, "    "), Re.test(y) || ee.test(y) || oe.test(y) || J.test(y) || qe.test(y)) break;
            if (V.search(this.rules.other.nonSpaceChar) >= w || !y.trim()) d += `
` + V.slice(w);
            else {
              if (A || b.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Re.test(b) || ee.test(b) || qe.test(b)) break;
              d += `
` + y;
            }
            !A && !y.trim() && (A = !0), g += le + `
`, t = t.substring(le.length + 1), b = V.slice(w);
          }
        }
        r.loose || (a ? r.loose = !0 : this.rules.other.doubleBlankLine.test(g) && (a = !0));
        let U = null, ie;
        this.options.gfm && (U = this.rules.other.listIsTask.exec(d), U && (ie = U[0] !== "[ ] ", d = d.replace(this.rules.other.listReplaceTask, ""))), r.items.push({ type: "list_item", raw: g, task: !!U, checked: ie, loose: !1, text: d, tokens: [] }), r.raw += g;
      }
      let p = r.items.at(-1);
      if (p) p.raw = p.raw.trimEnd(), p.text = p.text.trimEnd();
      else return;
      r.raw = r.raw.trimEnd();
      for (let c = 0; c < r.items.length; c++) if (this.lexer.state.top = !1, r.items[c].tokens = this.lexer.blockTokens(r.items[c].text, []), !r.loose) {
        let g = r.items[c].tokens.filter((b) => b.type === "space"), d = g.length > 0 && g.some((b) => this.rules.other.anyLine.test(b.raw));
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
    let n = zr(e[1]), s = e[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = e[3]?.trim() ? e[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: e[0], header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let a of s) this.rules.other.tableAlignRight.test(a) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? o.align.push("left") : o.align.push(null);
      for (let a = 0; a < n.length; a++) o.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: !0, align: o.align[a] });
      for (let a of r) o.rows.push(zr(a, o.header.length).map((p, c) => ({ text: p, tokens: this.lexer.inline(p), header: !1, align: o.align[c] })));
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
        let o = Ea(e[2], "()");
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
      return s = s.trim(), this.rules.other.startAngleBracket.test(s) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? s = s.slice(1) : s = s.slice(1, -1)), Ur(e, { href: s && s.replace(this.rules.inline.anyPunctuation, "$1"), title: r && r.replace(this.rules.inline.anyPunctuation, "$1") }, e[0], this.lexer, this.rules);
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
      return Ur(n, r, n[0], this.lexer, this.rules);
    }
  }
  emStrong(t, e, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(t);
    if (!(!s || s[3] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(s[1] || s[2]) || !n || this.rules.inline.punctuation.exec(n))) {
      let r = [...s[0]].length - 1, o, a, p = r, c = 0, g = s[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (g.lastIndex = 0, e = e.slice(-1 * t.length + r); (s = g.exec(e)) != null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o) continue;
        if (a = [...o].length, s[3] || s[4]) {
          p += a;
          continue;
        } else if ((s[5] || s[6]) && r % 3 && !((r + a) % 3)) {
          c += a;
          continue;
        }
        if (p -= a, p > 0) continue;
        a = Math.min(a, a + p + c);
        let d = [...s[0]][0].length, b = t.slice(0, r + s.index + d + a);
        if (Math.min(r, a) % 2) {
          let A = b.slice(1, -1);
          return { type: "em", raw: b, text: A, tokens: this.lexer.inlineTokens(A) };
        }
        let y = b.slice(2, -2);
        return { type: "strong", raw: b, text: y, tokens: this.lexer.inlineTokens(y) };
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
}, K = class ln {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || $e, this.options.tokenizer = this.options.tokenizer || new St(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: !1, inRawBlock: !1, top: !0 };
    let n = { other: z, block: _t.normal, inline: Qe.normal };
    this.options.pedantic ? (n.block = _t.pedantic, n.inline = Qe.pedantic) : this.options.gfm && (n.block = _t.gfm, this.options.breaks ? n.inline = Qe.breaks : n.inline = Qe.gfm), this.tokenizer.rules = n;
  }
  static get rules() {
    return { block: _t, inline: Qe };
  }
  static lex(e, n) {
    return new ln(n).lex(e);
  }
  static lexInline(e, n) {
    return new ln(n).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(z.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let n = 0; n < this.inlineQueue.length; n++) {
      let s = this.inlineQueue[n];
      this.inlineTokens(s.src, s.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, n = [], s = !1) {
    for (this.options.pedantic && (e = e.replace(z.tabCharGlobal, "    ").replace(z.spaceLine, "")); e; ) {
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
        let a = 1 / 0, p = e.slice(1), c;
        this.options.extensions.startBlock.forEach((g) => {
          c = g.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
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
    let a = !1, p = "";
    for (; e; ) {
      a || (p = ""), a = !1;
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
      if (c = this.tokenizer.emStrong(e, s, p)) {
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
        let d = 1 / 0, b = e.slice(1), y;
        this.options.extensions.startInline.forEach((A) => {
          y = A.call({ lexer: this }, b), typeof y == "number" && y >= 0 && (d = Math.min(d, y));
        }), d < 1 / 0 && d >= 0 && (g = e.substring(0, d + 1));
      }
      if (c = this.tokenizer.inlineText(g)) {
        e = e.substring(c.raw.length), c.raw.slice(-1) !== "_" && (p = c.raw.slice(-1)), a = !0;
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
}, Et = class {
  options;
  parser;
  constructor(t) {
    this.options = t || $e;
  }
  space(t) {
    return "";
  }
  code({ text: t, lang: e, escaped: n }) {
    let s = (e || "").match(z.notSpaceStart)?.[0], r = t.replace(z.endingNewline, "") + `
`;
    return s ? '<pre><code class="language-' + se(s) + '">' + (n ? r : se(r, !0)) + `</code></pre>
` : "<pre><code>" + (n ? r : se(r, !0)) + `</code></pre>
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
      let p = t.items[a];
      s += this.listitem(p);
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
      t.loose ? t.tokens[0]?.type === "paragraph" ? (t.tokens[0].text = n + " " + t.tokens[0].text, t.tokens[0].tokens && t.tokens[0].tokens.length > 0 && t.tokens[0].tokens[0].type === "text" && (t.tokens[0].tokens[0].text = n + " " + se(t.tokens[0].tokens[0].text), t.tokens[0].tokens[0].escaped = !0)) : t.tokens.unshift({ type: "text", raw: n + " ", text: n + " ", escaped: !0 }) : e += n + " ";
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
    return `<code>${se(t, !0)}</code>`;
  }
  br(t) {
    return "<br>";
  }
  del({ tokens: t }) {
    return `<del>${this.parser.parseInline(t)}</del>`;
  }
  link({ href: t, title: e, tokens: n }) {
    let s = this.parser.parseInline(n), r = Nr(t);
    if (r === null) return s;
    t = r;
    let o = '<a href="' + t + '"';
    return e && (o += ' title="' + se(e) + '"'), o += ">" + s + "</a>", o;
  }
  image({ href: t, title: e, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = Nr(t);
    if (r === null) return se(n);
    t = r;
    let o = `<img src="${t}" alt="${n}"`;
    return e && (o += ` title="${se(e)}"`), o += ">", o;
  }
  text(t) {
    return "tokens" in t && t.tokens ? this.parser.parseInline(t.tokens) : "escaped" in t && t.escaped ? t.text : se(t.text);
  }
}, $n = class {
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
}, Q = class cn {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || $e, this.options.renderer = this.options.renderer || new Et(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $n();
  }
  static parse(e, n) {
    return new cn(n).parse(e);
  }
  static parseInline(e, n) {
    return new cn(n).parseInline(e);
  }
  parse(e, n = !0) {
    let s = "";
    for (let r = 0; r < e.length; r++) {
      let o = e[r];
      if (this.options.extensions?.renderers?.[o.type]) {
        let p = o, c = this.options.extensions.renderers[p.type].call({ parser: this }, p);
        if (c !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(p.type)) {
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
          let p = a, c = this.renderer.text(p);
          for (; r + 1 < e.length && e[r + 1].type === "text"; ) p = e[++r], c += `
` + this.renderer.text(p);
          n ? s += this.renderer.paragraph({ type: "paragraph", raw: c, text: c, tokens: [{ type: "text", raw: c, text: c, escaped: !0 }] }) : s += c;
          continue;
        }
        default: {
          let p = 'Token with "' + a.type + '" type was not found.';
          if (this.options.silent) return console.error(p), "";
          throw new Error(p);
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
        let p = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (p !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(o.type)) {
          s += p || "";
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
          let p = 'Token with "' + a.type + '" type was not found.';
          if (this.options.silent) return console.error(p), "";
          throw new Error(p);
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
    return this.block ? K.lex : K.lexInline;
  }
  provideParser() {
    return this.block ? Q.parse : Q.parseInline;
  }
}, Ra = class {
  defaults = kn();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = Q;
  Renderer = Et;
  TextRenderer = $n;
  Lexer = K;
  Tokenizer = St;
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
            let p = r.renderer.apply(this, a);
            return p === !1 && (p = o.apply(this, a)), p;
          } : e.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let o = e[r.level];
          o ? o.unshift(r.tokenizer) : e[r.level] = [r.tokenizer], r.start && (r.level === "block" ? e.startBlock ? e.startBlock.push(r.start) : e.startBlock = [r.start] : r.level === "inline" && (e.startInline ? e.startInline.push(r.start) : e.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (e.childTokens[r.name] = r.childTokens);
      }), s.extensions = e), n.renderer) {
        let r = this.defaults.renderer || new Et(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r)) throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o)) continue;
          let a = o, p = n.renderer[a], c = r[a];
          r[a] = (...g) => {
            let d = p.apply(r, g);
            return d === !1 && (d = c.apply(r, g)), d || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new St(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r)) throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o)) continue;
          let a = o, p = n.tokenizer[a], c = r[a];
          r[a] = (...g) => {
            let d = p.apply(r, g);
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
          let a = o, p = n.hooks[a], c = r[a];
          tt.passThroughHooks.has(o) ? r[a] = (g) => {
            if (this.defaults.async && tt.passThroughHooksRespectAsync.has(o)) return (async () => {
              let b = await p.call(r, g);
              return c.call(r, b);
            })();
            let d = p.call(r, g);
            return c.call(r, d);
          } : r[a] = (...g) => {
            if (this.defaults.async) return (async () => {
              let b = await p.apply(r, g);
              return b === !1 && (b = await c.apply(r, g)), b;
            })();
            let d = p.apply(r, g);
            return d === !1 && (d = c.apply(r, g)), d;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        s.walkTokens = function(a) {
          let p = [];
          return p.push(o.call(this, a)), r && (p = p.concat(r.call(this, a))), p;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(t) {
    return this.defaults = { ...this.defaults, ...t }, this;
  }
  lexer(t, e) {
    return K.lex(t, e ?? this.defaults);
  }
  parser(t, e) {
    return Q.parse(t, e ?? this.defaults);
  }
  parseMarkdown(t) {
    return (e, n) => {
      let s = { ...n }, r = { ...this.defaults, ...s }, o = this.onError(!!r.silent, !!r.async);
      if (this.defaults.async === !0 && s.async === !1) return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof e > "u" || e === null) return o(new Error("marked(): input parameter is undefined or null"));
      if (typeof e != "string") return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(e) + ", string expected"));
      if (r.hooks && (r.hooks.options = r, r.hooks.block = t), r.async) return (async () => {
        let a = r.hooks ? await r.hooks.preprocess(e) : e, p = await (r.hooks ? await r.hooks.provideLexer() : t ? K.lex : K.lexInline)(a, r), c = r.hooks ? await r.hooks.processAllTokens(p) : p;
        r.walkTokens && await Promise.all(this.walkTokens(c, r.walkTokens));
        let g = await (r.hooks ? await r.hooks.provideParser() : t ? Q.parse : Q.parseInline)(c, r);
        return r.hooks ? await r.hooks.postprocess(g) : g;
      })().catch(o);
      try {
        r.hooks && (e = r.hooks.preprocess(e));
        let a = (r.hooks ? r.hooks.provideLexer() : t ? K.lex : K.lexInline)(e, r);
        r.hooks && (a = r.hooks.processAllTokens(a)), r.walkTokens && this.walkTokens(a, r.walkTokens);
        let p = (r.hooks ? r.hooks.provideParser() : t ? Q.parse : Q.parseInline)(a, r);
        return r.hooks && (p = r.hooks.postprocess(p)), p;
      } catch (a) {
        return o(a);
      }
    };
  }
  onError(t, e) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, t) {
        let s = "<p>An error occurred:</p><pre>" + se(n.message + "", !0) + "</pre>";
        return e ? Promise.resolve(s) : s;
      }
      if (e) return Promise.reject(n);
      throw n;
    };
  }
}, Se = new Ra();
function v(t, e) {
  return Se.parse(t, e);
}
v.options = v.setOptions = function(t) {
  return Se.setOptions(t), v.defaults = Se.defaults, Qr(v.defaults), v;
};
v.getDefaults = kn;
v.defaults = $e;
v.use = function(...t) {
  return Se.use(...t), v.defaults = Se.defaults, Qr(v.defaults), v;
};
v.walkTokens = function(t, e) {
  return Se.walkTokens(t, e);
};
v.parseInline = Se.parseInline;
v.Parser = Q;
v.parser = Q.parse;
v.Renderer = Et;
v.TextRenderer = $n;
v.Lexer = K;
v.lexer = K.lex;
v.Tokenizer = St;
v.Hooks = tt;
v.parse = v;
v.options;
v.setOptions;
v.use;
v.walkTokens;
v.parseInline;
Q.parse;
K.lex;
const Oa = { CHILD: 2 }, Ca = (t) => (...e) => ({ _$litDirective$: t, values: e });
class Pa {
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
class pn extends Pa {
  constructor(e) {
    if (super(e), this.it = R, e.type !== Oa.CHILD) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(e) {
    if (e === R || e == null) return this._t = void 0, this.it = e;
    if (e === Te) return e;
    if (typeof e != "string") throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (e === this.it) return this._t;
    this.it = e;
    const n = [e];
    return n.raw = n, this._t = { _$litType$: this.constructor.resultType, strings: n, values: [] };
  }
}
pn.directiveName = "unsafeHTML", pn.resultType = 1;
const Ia = Ca(pn), cs = dn`
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
var La = Object.defineProperty, Da = Object.getOwnPropertyDescriptor, Fe = (t, e, n, s) => {
  for (var r = s > 1 ? void 0 : s ? Da(e, n) : e, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (r = (s ? a(e, n, r) : a(r)) || r);
  return s && r && La(e, n, r), r;
};
let fe = class extends Ue {
  constructor() {
    super(...arguments), this.content = "", this.type = "assistant", this.markdown = !0, this.timestamp = Date.now(), this.theme = "light";
  }
  updated() {
    for (const t of this.renderRoot.querySelectorAll("a"))
      t.target = "_blank", t.rel = "noopener noreferrer";
  }
  render() {
    const t = this.markdown ? Ia(Ma(this.content)) : this.content;
    return D`
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
fe.styles = [
  cs,
  dn`
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
  W()
], fe.prototype, "content", 2);
Fe([
  W()
], fe.prototype, "type", 2);
Fe([
  W({ type: Boolean })
], fe.prototype, "markdown", 2);
Fe([
  W({ type: Number })
], fe.prototype, "timestamp", 2);
Fe([
  W({ reflect: !0 })
], fe.prototype, "theme", 2);
fe = Fe([
  Yr("vanna-message")
], fe);
function Ma(t) {
  const e = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), n = v.parse(e, { async: !1 });
  return Gi.sanitize(n, {
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
class we extends Error {
  constructor(e, n = "transport_error", s) {
    super(e), this.code = n, this.status = s, this.name = "VannaApiError";
  }
}
function Rn(t) {
  return Ee(t) && ae(t, ["error", "conversation_id", "request_id", "timestamp"]) && hs(t) && Ee(t.error) && ae(t.error, ["code", "message"]) && typeof t.error.code == "string" && typeof t.error.message == "string";
}
function ps(t) {
  const e = t.trim();
  if (!e || e.startsWith("//")) return !1;
  try {
    const n = new URL(e, globalThis.location?.origin ?? "http://localhost");
    return n.protocol === "http:" || n.protocol === "https:";
  } catch {
    return !1;
  }
}
class us {
  constructor(e = {}) {
    this.baseUrl = e.baseUrl ?? "", this.sseEndpoint = e.sseEndpoint ?? "/api/vanna/v3/chat_sse", this.pollEndpoint = e.pollEndpoint ?? "/api/vanna/v3/chat_poll", this.customHeaders = e.customHeaders ?? {};
  }
  setCustomHeaders(e) {
    this.customHeaders = { ...e };
  }
  getCustomHeaders() {
    return { ...this.customHeaders };
  }
  async *streamChat(e) {
    const n = await fetch(this.resolveUrl(this.sseEndpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...this.customHeaders
      },
      body: JSON.stringify(e)
    });
    await this.assertOk(n);
    const s = n.body?.getReader();
    if (!s) throw new we("The server returned an empty response.");
    const r = new TextDecoder();
    let o = "";
    try {
      for (; ; ) {
        const { done: a, value: p } = await s.read();
        o += r.decode(p, { stream: !a }).replace(/\r\n/g, `
`);
        const c = o.split(`

`);
        o = c.pop() ?? "";
        for (const g of c) {
          const d = this.parseSseEvent(g);
          if (d === null) return;
          d && (yield d);
        }
        if (a) break;
      }
      if (o.trim()) {
        const a = this.parseSseEvent(o);
        a && (yield a);
      }
    } finally {
      s.releaseLock();
    }
  }
  async sendPollMessage(e) {
    const n = await fetch(this.resolveUrl(this.pollEndpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.customHeaders
      },
      body: JSON.stringify(e)
    });
    await this.assertOk(n);
    const s = await n.json();
    if (!Ua(s))
      throw new we("The server returned an invalid polling response.");
    return s;
  }
  generateId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  resolveUrl(e) {
    return /^https?:\/\//i.test(e) ? e : `${this.baseUrl}${e}`;
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
      throw new we("The server returned malformed stream data.");
    }
    if (!ds(s))
      throw new we("The server returned an unsupported component.");
    return s;
  }
  async assertOk(e) {
    if (e.ok) return;
    let n = "http_error", s = `Request failed with HTTP ${e.status}.`;
    try {
      const r = await e.json();
      Rn(r) && (n = r.error.code, s = r.error.message);
    } catch {
    }
    throw new we(s, n, e.status);
  }
}
function Ee(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function Na(t) {
  return t === null || typeof t == "string" || typeof t == "boolean" || typeof t == "number" && Number.isFinite(t);
}
function ae(t, e) {
  return Object.keys(t).every((n) => e.includes(n));
}
function za(t) {
  if (!Ee(t) || typeof t.type != "string") return !1;
  if (t.type === "text")
    return ae(t, ["type", "text"]) && typeof t.text == "string";
  if (t.type === "link")
    return ae(t, ["type", "url", "text"]) && typeof t.url == "string" && ps(t.url) && (t.text === void 0 || t.text === null || typeof t.text == "string");
  if (t.type === "dataframe") {
    if (!ae(t, ["type", "columns", "rows", "title", "truncated"]) || !Array.isArray(t.columns)) return !1;
    const e = t.columns;
    if (!e.every((s) => typeof s == "string")) return !1;
    const n = e;
    return new Set(n).size !== n.length || !Array.isArray(t.rows) || t.rows.length > 100 || typeof t.truncated != "boolean" || !(t.title === void 0 || t.title === null || typeof t.title == "string") ? !1 : t.rows.every((s) => Ee(s) && Object.keys(s).length === n.length && n.every((r) => r in s) && Object.values(s).every(Na));
  }
  return !1;
}
function hs(t) {
  return typeof t.conversation_id == "string" && typeof t.request_id == "string" && typeof t.timestamp == "number" && Number.isFinite(t.timestamp);
}
function ds(t) {
  return !Ee(t) || !hs(t) ? !1 : "component" in t ? ae(
    t,
    ["component", "conversation_id", "request_id", "timestamp"]
  ) && za(t.component) : ae(t, ["error", "conversation_id", "request_id", "timestamp"]) && Ee(t.error) && ae(t.error, ["code", "message"]) && typeof t.error.code == "string" && typeof t.error.message == "string";
}
function Ua(t) {
  return !Ee(t) || !ae(
    t,
    ["chunks", "conversation_id", "request_id", "total_chunks"]
  ) || !Array.isArray(t.chunks) || typeof t.conversation_id != "string" || typeof t.request_id != "string" || !Number.isInteger(t.total_chunks) || t.total_chunks !== t.chunks.length ? !1 : t.chunks.every((e) => ds(e) && !Rn(e) && e.conversation_id === t.conversation_id && e.request_id === t.request_id);
}
const Za = new us();
var Ha = Object.defineProperty, Ba = Object.getOwnPropertyDescriptor, Z = (t, e, n, s) => {
  for (var r = s > 1 ? void 0 : s ? Ba(e, n) : e, o = t.length - 1, a; o >= 0; o--)
    (a = t[o]) && (r = (s ? a(e, n, r) : a(r)) || r);
  return s && r && Ha(e, n, r), r;
};
let j = class extends Ue {
  constructor() {
    super(...arguments), this.title = "Vanna AI Chat", this.subtitle = "", this.placeholder = "Ask me anything...", this.disabled = !1, this.theme = "light", this.apiBaseUrl = "", this.sseEndpoint = "/api/vanna/v3/chat_sse", this.pollEndpoint = "/api/vanna/v3/chat_poll", this.currentMessage = "", this.busy = !1, this.items = [], this.conversationId = this.generateId(), this.customHeaders = {};
  }
  firstUpdated() {
    this.requestStarter();
  }
  render() {
    const t = this.disabled || this.busy;
    return D`
      <section class="shell" aria-busy=${String(this.busy)}>
        <header>
          <h1>${this.title}</h1>
          ${this.subtitle ? D`<p class="subtitle">${this.subtitle}</p>` : R}
        </header>
        <main class="messages" aria-live="polite">
          ${this.items.length === 0 && !this.busy ? D`<div class="empty">Ask a question to begin.</div>` : this.items.map((e) => this.renderItem(e))}
          ${this.busy ? D`<p class="busy" role="status">Thinking…</p>` : R}
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
    this.items = [], this.conversationId = this.generateId();
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
    this.busy = !0;
    const n = this.createClient(), s = { ...t, request_id: n.generateId() };
    let r = !1;
    try {
      try {
        for await (const o of n.streamChat(s)) {
          if (r = !0, Rn(o))
            throw new we(o.error.message, o.error.code);
          this.appendChunk(o);
        }
      } catch (o) {
        if (r) throw o;
      }
      r || await this.consumePoll(n, s);
    } catch (o) {
      e || this.appendError(o);
    } finally {
      this.busy = !1, await this.scrollToEnd();
    }
  }
  async consumePoll(t, e) {
    const n = await t.sendPollMessage(e);
    for (const s of n.chunks) this.appendChunk(s);
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
  appendError(t) {
    const e = t instanceof we ? t.message : "The request could not be completed. Please try again.";
    this.addMessage(e, "assistant"), this.dispatchEvent(new CustomEvent("chat-error", {
      detail: { message: e },
      bubbles: !0,
      composed: !0
    }));
  }
  renderItem(t) {
    if (t.kind === "user")
      return D`<vanna-message
        type="user"
        .content=${t.text}
        .markdown=${!1}
        .timestamp=${t.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
    const e = t.component;
    return e.type === "text" ? D`<vanna-message
        type="assistant"
        .content=${e.text}
        .markdown=${!0}
        .timestamp=${t.timestamp}
        theme=${this.theme}
      ></vanna-message>` : e.type === "dataframe" ? this.renderDataFrame(e) : ps(e.url) ? D`<div class="component">
      <a class="link-card" href=${e.url} target="_blank" rel="noopener noreferrer">
        ${e.text || e.url}
      </a>
    </div>` : D`<vanna-message
        type="assistant"
        content="Unsupported link"
        .timestamp=${t.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
  }
  renderDataFrame(t) {
    return D`<section class="component table-card">
      ${t.title ? D`<h2 class="table-title">${t.title}</h2>` : R}
      <div class="table-scroll">
        <table>
          <thead><tr>${t.columns.map((e) => D`<th scope="col">${e}</th>`)}</tr></thead>
          <tbody>
            ${t.rows.length ? t.rows.map((e) => D`<tr>${t.columns.map(
      (n) => D`<td>${this.formatCell(e[n])}</td>`
    )}</tr>`) : D`<tr><td colspan=${Math.max(t.columns.length, 1)}>No rows returned.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${t.truncated ? D`<p class="table-note">Showing the first 100 rows.</p>` : R}
    </section>`;
  }
  formatCell(t) {
    return t == null ? "—" : String(t);
  }
  createClient() {
    return new us({
      baseUrl: this.apiBaseUrl,
      sseEndpoint: this.sseEndpoint,
      pollEndpoint: this.pollEndpoint,
      customHeaders: this.customHeaders
    });
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
j.styles = [
  cs,
  dn`
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
        padding: var(--vanna-space-5) var(--vanna-space-6);
        border-bottom: 1px solid var(--vanna-outline-dimmer);
      }
      h1 { margin: 0; font-size: 18px; font-weight: 650; }
      .subtitle {
        margin: 4px 0 0;
        color: var(--vanna-foreground-dimmer);
        font-size: 13px;
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
      .link-card {
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 10px;
        color: var(--vanna-accent-primary-default);
        font-weight: 600;
        text-decoration: none;
      }
      .link-card:hover { background: var(--vanna-background-higher); }

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
      button {
        min-width: 82px;
        border: 0;
        border-radius: 10px;
        background: var(--vanna-accent-primary-default);
        color: white;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
      }
      button:disabled, textarea:disabled { cursor: not-allowed; opacity: 0.55; }

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
Z([
  W()
], j.prototype, "title", 2);
Z([
  W()
], j.prototype, "subtitle", 2);
Z([
  W()
], j.prototype, "placeholder", 2);
Z([
  W({ type: Boolean })
], j.prototype, "disabled", 2);
Z([
  W({ reflect: !0 })
], j.prototype, "theme", 2);
Z([
  W({ attribute: "api-base" })
], j.prototype, "apiBaseUrl", 2);
Z([
  W({ attribute: "sse-endpoint" })
], j.prototype, "sseEndpoint", 2);
Z([
  W({ attribute: "poll-endpoint" })
], j.prototype, "pollEndpoint", 2);
Z([
  xn()
], j.prototype, "currentMessage", 2);
Z([
  xn()
], j.prototype, "busy", 2);
Z([
  xn()
], j.prototype, "items", 2);
j = Z([
  Yr("vanna-chat")
], j);
typeof console < "u" && console.info("Vanna WebComponent 3.0.0 (2026-08-31T01:36:57.621Z)");
export {
  us as VannaApiClient,
  we as VannaApiError,
  j as VannaChat,
  fe as VannaMessage,
  Za as apiClient,
  Rn as isChatStreamError,
  ps as isSafeLink,
  Ma as renderSafeMarkdown
};
