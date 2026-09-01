/**
 * Раскладывает шрифты из node_modules в /public/fonts и собирает fonts.css.
 *
 * Зачем не подключать fontsource импортом: Astro тогда кладёт шрифты в
 * /_astro/ с хешем в имени, и на них нельзя поставить <link rel="preload"> из
 * шаблона — путь известен только после сборки. Preload критических субсетов
 * стоит примерно 0,4 с LCP на мобильном, поэтому имена держим стабильными.
 *
 * Субсеты выбраны поимённо, а не «все подряд»: greek, vietnamese, math и
 * symbols для русского лендинга — мёртвый вес.
 *
 * latin-ext здесь обязателен и не подлежит обрезке: знак рубля U+20BD лежит
 * именно в нём. Без latin-ext строка «от 5 400 000 ₽» отрисует цифры своим
 * шрифтом, а рубль — системным, и это видно невооружённым глазом.
 */
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'fonts');
mkdirSync(outDir, { recursive: true });

/** Порядок субсетов важен: он же порядок @font-face в CSS. */
const SUBSETS = ['cyrillic', 'latin', 'latin-ext'];

const FONTS = [
  { pkg: 'geologica', family: 'Geologica', weights: '300 700' },
  { pkg: 'onest', family: 'Onest', weights: '300 800' },
  { pkg: 'martian-mono', family: 'Martian Mono', weights: '400 600' },
];

/** Грузятся до первой отрисовки: заголовок, текст первого экрана и цена с ₽. */
const PRELOAD = new Set([
  'geologica-cyrillic-wght-normal.woff2',
  'onest-cyrillic-wght-normal.woff2',
  'onest-latin-wght-normal.woff2',
  'onest-latin-ext-wght-normal.woff2',
]);

const blocks = [];
const preloadList = [];
let total = 0;

for (const font of FONTS) {
  const pkgDir = join(root, 'node_modules', `@fontsource-variable/${font.pkg}`);
  const unicode = JSON.parse(readFileSync(join(pkgDir, 'unicode.json'), 'utf8'));

  for (const subset of SUBSETS) {
    const file = `${font.pkg}-${subset}-wght-normal.woff2`;
    const src = join(pkgDir, 'files', file);
    if (!existsSync(src)) {
      throw new Error(`Нет субсета ${file}. Проверьте версию @fontsource-variable/${font.pkg}.`);
    }
    const range = unicode[subset];
    if (!range) throw new Error(`В unicode.json пакета ${font.pkg} нет субсета ${subset}.`);

    copyFileSync(src, join(outDir, file));
    total += readFileSync(src).length;

    blocks.push(
      `@font-face {\n` +
        `  font-family: '${font.family}';\n` +
        `  font-style: normal;\n` +
        `  font-weight: ${font.weights};\n` +
        `  font-display: swap;\n` +
        `  src: url('/fonts/${file}') format('woff2-variations');\n` +
        `  unicode-range: ${range};\n` +
        `}`
    );
    if (PRELOAD.has(file)) preloadList.push(file);
  }
}

writeFileSync(
  join(root, 'src', 'styles', 'fonts.css'),
  `/* Файл собран скриптом scripts/prepare-fonts.mjs. Руками не править. */\n\n` +
    blocks.join('\n\n') +
    '\n'
);

writeFileSync(
  join(root, 'src', 'config', 'preload-fonts.json'),
  JSON.stringify(preloadList, null, 2) + '\n'
);

console.log(`Шрифты: ${blocks.length} субсетов, ${(total / 1024).toFixed(0)} КБ, из них в preload ${preloadList.length}.`);
