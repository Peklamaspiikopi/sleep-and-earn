// i18n.js — многоязычность (ru, en, uk, es, fr, ar)
//
// Как это устроено:
//  * Ключ перевода — сама РУССКАЯ строка. Строки с числами/именами пишутся
//    шаблоном: "Жетоны: {}" — {} ловит любую вставку, а в переводе она
//    подставляется как {1}, {2}... (в порядке появления).
//  * I18N.tr(ru, en) — перевод строки из кода. Для ru возвращает ru, для en —
//    en (если передан), для остальных — словарь, а если перевода нет — английский.
//  * MutationObserver сам переводит любой русский текст, попавший в DOM
//    (и статичный из index.html, и выставленный через innerText/innerHTML).
//    Оригинал запоминается, поэтому переключение обратно на русский работает.
//  * alert()/confirm() тоже пропускаются через tr().
//  * Словарь строк лежит в i18n-data.js (I18N_ROWS), переводы блока translations
//    из script.js — там же (I18N_KEYS).
(function () {
  const LANGS = {
    ru: { name: 'Русский', locale: 'ru-RU', dir: 'ltr' },
    en: { name: 'English', locale: 'en-US', dir: 'ltr' },
    uk: { name: 'Українська', locale: 'uk-UA', dir: 'ltr' },
    es: { name: 'Español', locale: 'es-ES', dir: 'ltr' },
    fr: { name: 'Français', locale: 'fr-FR', dir: 'ltr' },
    ar: { name: 'العربية', locale: 'ar', dir: 'rtl' },
  };
  // Страны СНГ и близкие — по умолчанию русский, остальным неизвестным — английский
  const RU_DEFAULT_CODES = ['ru', 'be', 'kk', 'ky', 'uz', 'tg', 'hy', 'az', 'ka', 'tk', 'mo'];
  const CYR = /[А-Яа-яЁё]/;

  let lang = 'ru';
  const exact = Object.create(null);
  const templ = [];

  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function addRows(rows) {
    rows.forEach((row) => {
      const key = norm(row[0]);
      const entry = { en: row[1], uk: row[2], es: row[3], fr: row[4], ar: row[5] };
      if (key.indexOf('{}') === -1) {
        exact[key] = entry;
      } else {
        const parts = key.split('{}');
        templ.push({
          re: new RegExp('^' + parts.map(esc).join('(.+?)') + '$'),
          spec: parts.join('').length,
          entry,
        });
      }
    });
    // Более конкретные шаблоны (с большим количеством «своего» текста) проверяем первыми
    templ.sort((a, b) => b.spec - a.spec);
  }

  function lookup(str, l) {
    const n = norm(str);
    let entry = exact[n];
    let caps = null;
    if (!entry) {
      for (let i = 0; i < templ.length; i++) {
        const m = n.match(templ[i].re);
        if (m) { entry = templ[i].entry; caps = m.slice(1); break; }
      }
    }
    if (!entry) return null;
    let out = entry[l];
    if (out == null || out === '') return null;
    if (caps) out = out.replace(/\{(\d)\}/g, (_, i) => (caps[i - 1] != null ? caps[i - 1] : ''));
    return out;
  }

  function tr(ru, en) {
    if (typeof ru !== 'string' || lang === 'ru') return ru;
    if (lang === 'en') {
      if (en != null) return en;
      const e = lookup(ru, 'en');
      return e != null ? e : ru;
    }
    const own = lookup(ru, lang);
    if (own != null) return own;
    if (en != null) return en;
    const e = lookup(ru, 'en');
    return e != null ? e : ru;
  }

  // ==== DOM ====
  const recs = new WeakMap(); // текстовый узел -> { ru: оригинал, shown: что мы показали }

  function shownFor(ru) {
    if (lang === 'ru') return ru;
    const lead = ru.match(/^\s*/)[0];
    const trail = ru.match(/\s*$/)[0];
    const out = tr(ru.trim());
    return out === ru.trim() ? ru : lead + out + trail;
  }

  function translateTextNode(n) {
    const cur = n.nodeValue;
    const rec = recs.get(n);
    if (rec && cur === rec.shown) return;      // это наш собственный результат
    if (!cur || !CYR.test(cur)) { if (rec) recs.delete(n); return; }
    const shown = shownFor(cur);
    recs.set(n, { ru: cur, shown });
    if (shown !== cur) n.nodeValue = shown;
  }

  function textNodes(root) {
    const list = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentNode && node.parentNode.nodeName;
        return (p === 'SCRIPT' || p === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = w.nextNode())) list.push(n);
    return list;
  }

  function retranslateAll() {
    textNodes(document.body).forEach((n) => {
      const rec = recs.get(n);
      if (!rec) { translateTextNode(n); return; }
      const shown = shownFor(rec.ru);
      rec.shown = shown;
      if (n.nodeValue !== shown) n.nodeValue = shown;
    });
  }

  function startObserver() {
    const mo = new MutationObserver((muts) => {
      for (let i = 0; i < muts.length; i++) {
        const m = muts[i];
        if (m.type === 'characterData') translateTextNode(m.target);
        else m.addedNodes.forEach((nd) => {
          if (nd.nodeType === 3) translateTextNode(nd);
          else if (nd.nodeType === 1) textNodes(nd).forEach(translateTextNode);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function setLang(l) {
    if (!LANGS[l]) l = 'ru';
    lang = l;
    const root = document.documentElement;
    root.lang = l;
    root.dir = LANGS[l].dir;
    if (document.body) retranslateAll();
  }

  function detect(tg) {
    let saved = null;
    try { saved = localStorage.getItem('sleep_lang'); } catch (e) {}
    if (saved && LANGS[saved]) return saved;
    const code = String((tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) || '')
      .toLowerCase().split('-')[0];
    if (LANGS[code]) return code;
    if (!code || RU_DEFAULT_CODES.indexOf(code) !== -1) return 'ru';
    return 'en';
  }

  // Выбор значения из объекта вида { ru, en, uk, ... } с запасным вариантом
  function pick(obj) {
    if (!obj) return undefined;
    return obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : obj.ru);
  }

  // alert / confirm
  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  window.alert = (m) => nativeAlert(typeof m === 'string' ? tr(m) : m);
  window.confirm = (m) => nativeConfirm(typeof m === 'string' ? tr(m) : m);

  window.I18N = {
    LANGS,
    get lang() { return lang; },
    tr, lookup: (s, l) => lookup(s, l || lang),
    setLang, detect, pick, addRows,
    locale: () => LANGS[lang].locale,
  };

  if (Array.isArray(window.I18N_ROWS)) addRows(window.I18N_ROWS);
  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver);
})();
