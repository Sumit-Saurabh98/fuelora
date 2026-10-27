// Renders the Fuelora icon set: a lime fuel drop with an ink efficiency gauge on ink.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const INK = '#0E0E14';
const LIME = '#C8F542';
const VIOLET = '#5B2EE6';
const PINK = '#FF5C93';

const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

// Drop + gauge drawn on a 1024 canvas, centred on (512, 512).
const DROP = 'M512 150 C604 268 760 426 760 606 A248 248 0 1 1 264 606 C264 426 420 268 512 150 Z';
const C = { x: 512, y: 640, r: 150 };
const pt = (deg, r = C.r) => {
  const a = (deg * Math.PI) / 180;
  return [C.x + r * Math.cos(a), C.y + r * Math.sin(a)].map((n) => n.toFixed(1));
};
const [ax1, ay1] = pt(150);
const [ax2, ay2] = pt(30);
const GAUGE_ARC = `M${ax1} ${ay1} A${C.r} ${C.r} 0 1 1 ${ax2} ${ay2}`;
const [nx, ny] = pt(-50, 118);

function glyph({ drop = LIME, mark = INK, accent = PINK } = {}) {
  return `
    <path d="${DROP}" fill="${drop}"/>
    <path d="${GAUGE_ARC}" fill="none" stroke="${mark}" stroke-width="46" stroke-linecap="round"/>
    <line x1="${C.x}" y1="${C.y}" x2="${nx}" y2="${ny}" stroke="${mark}" stroke-width="46" stroke-linecap="round"/>
    <circle cx="${C.x}" cy="${C.y}" r="44" fill="${mark}"/>
    <circle cx="${C.x}" cy="${C.y}" r="20" fill="${accent}"/>`;
}

const background = `
  <defs>
    <radialGradient id="glow" cx="78%" cy="92%" r="80%">
      <stop offset="0" stop-color="${VIOLET}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lime" cx="50%" cy="55%" r="45%">
      <stop offset="0" stop-color="${LIME}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${LIME}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="${INK}"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <rect width="1024" height="1024" fill="url(#lime)"/>`;

const svg = (body, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;

// Scale the glyph around the canvas centre (Android adaptive safe zone is the inner 66%).
const scaled = (s, body) =>
  `<g transform="translate(512 512) scale(${s}) translate(-512 -512)">${body}</g>`;

const monochrome = `
  <defs><mask id="cut">
    <rect width="1024" height="1024" fill="black"/>
    ${glyph({ drop: 'white', mark: 'black', accent: 'black' })}
  </mask></defs>
  <rect width="1024" height="1024" fill="white" mask="url(#cut)"/>`;

const files = {
  'icon.png': [svg(background + scaled(0.86, glyph())), 1024],
  'android-icon-background.png': [svg(background), 1024],
  'android-icon-foreground.png': [svg(scaled(0.78, glyph())), 1024],
  'android-icon-monochrome.png': [svg(scaled(0.78, monochrome)), 1024],
  'splash-icon.png': [svg(scaled(1.15, glyph())), 512],
  'favicon.png': [svg(background + scaled(0.86, glyph())), 48],
  'preview-store.png': [svg(background + scaled(0.86, glyph())), 512],
};

for (const [name, [content, size]] of Object.entries(files)) {
  const png = new Resvg(content, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(out, name), png);
  console.log(name, size);
}
