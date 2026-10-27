// The bundled emoji font (src/emoji.css) lets each browser pick a build with tech(): COLRv1 for
// Chrome/Firefox, OpenType-SVG for Safari. Safari 27 (iOS 27) draws SVG emoji glyphs blank in page
// text, yet draws the COLRv1 build fine while still saying it can't, so tech() alone picks the broken
// one. Older Safari is the other way round (blank COLRv1), so point only Safari 27+ at the COLRv1
// files. `:heading` arrived in Safari 27, which makes it a cheap way to tell them apart.

const FAMILY = 'Blorbit Emoji';

export function fixEmojiFont() {
  if (!window.CSS?.supports || CSS.supports('font-tech(color-COLRv1)') || !CSS.supports('selector(:heading)')) return false;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = [...sheet.cssRules]; } catch { continue; }
    // @font-face rules are read-only from script in some browsers, so swap each for a FontFace instead
    for (let i = rules.length - 1; i >= 0; i--) {
      const r = rules[i];
      if (!(r instanceof CSSFontFaceRule) || !r.style.getPropertyValue('font-family').includes(FAMILY)) continue;
      const url = r.style.getPropertyValue('src').match(/url\("?([^")]*colr-\d+\.woff2)"?\)/)?.[1];
      if (!url) continue;
      const href = new URL(url, sheet.href || location.href).href; // relative to the stylesheet, not the page
      document.fonts.add(new FontFace(FAMILY, `url(${href}) format("woff2")`, { display: 'swap', unicodeRange: r.style.getPropertyValue('unicode-range') }));
      sheet.deleteRule(i);
    }
  }
  return true;
}
