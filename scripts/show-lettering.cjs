const { glyphs } = require('../images/typecabinet/manifest.json');

const regular = new Map();
const filled = new Map();
for (const glyph of Object.values(glyphs)) {
  if (glyph.style === 'filled' && glyph.character) regular.set(glyph.character, glyph);
  if (glyph.style === 'filled-front' && (glyph.occurrence ?? 1) === 1) {
    filled.set(glyph.character, glyph);
  }
}

function image(variant, className = '') {
  const { file, width, height } = variant;
  const classAttr = className ? ` class="${className}"` : '';
  return `<img${classAttr} src="images/typecabinet/${file}" width="${width}" height="${height}" alt="" decoding="async">`;
}

function escapeText(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function words(text, emphasized) {
  const characterSet = emphasized ? filled : regular;
  const wordClass = emphasized ? 'word tlm-filled' : 'word';
  return (text.match(/\S+/gu) || []).map(word => {
    const letters = Array.from(word.toUpperCase(), character => {
      const glyph = characterSet.get(character) || regular.get(character);
      if (glyph) return image(glyph.variants[128]);
      // Keep punctuation or letters without a drawing visible as ordinary text.
      return escapeText(character);
    });
    return `<span class="${wordClass}">${letters.join('')}</span>`;
  });
}

function renderLettering(announcement, details) {
  const rendered = [...words(announcement, false), ...words(details, true)];
  if (!rendered.length) return '';
  const skull = image(glyphs.skull.variants[256], 'paragraph-marker');
  rendered[0] = `<span class="paragraph-start">${skull}${rendered[0]}</span>`;
  return `<span class="lettering" aria-hidden="true">\n        ${rendered.join('\n        ')}\n      </span>`;
}

module.exports = { escapeText, renderLettering };
