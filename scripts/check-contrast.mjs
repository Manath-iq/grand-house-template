/**
 * Проверка контраста палитры.
 *
 * Цвета читаются из tokens.ts, поэтому проверка не устаревает при их смене —
 * а меняются они как раз тогда, когда клиент присылает свой фирменный цвет,
 * и это ровно тот момент, когда контраст ломается незаметно.
 *
 * Порог 4.5:1 — обычный текст по WCAG AA. Аудитория 30–45+, половина читает
 * с телефона на улице, поэтому послаблений для крупного текста здесь нет.
 *
 *   npm run contrast
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'config', 'tokens.ts'), 'utf8');

const palette = Object.fromEntries(
  [...src.matchAll(/^\s*([a-zA-Z]+):\s*'(#[0-9A-Fa-f]{6})'/gm)].map((m) => [m[1], m[2]])
);

const channel = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* Пары ровно те, что складываются в вёрстке: светлая база с тремя
   поверхностями, тёмная секция с тремя и текст на заливке акцента. */
const LIGHT = ['paper', 'paperSoft', 'paperDeep'];
const DARK = ['ink', 'inkSoft', 'inkDeep'];

const pairs = [
  ...LIGHT.flatMap((bg) => [
    ['ink', bg, 'основной текст'],
    ['muted', bg, 'вспомогательный текст'],
    ['accent', bg, 'акцентный текст'],
  ]),
  ...DARK.flatMap((bg) => [
    ['paper', bg, 'основной текст'],
    ['mutedOnInk', bg, 'вспомогательный текст'],
    ['accentOnInk', bg, 'акцентный текст'],
  ]),
  ['paper', 'accent', 'текст на заливке акцента'],
  ['ink', 'accentOnInk', 'текст на светлой заливке акцента'],
];

let failed = 0;
for (const [fg, bg, what] of pairs) {
  const value = ratio(palette[fg], palette[bg]);
  const ok = value >= 4.5;
  if (!ok) failed++;
  console.log(
    `${ok ? 'OK  ' : 'МАЛО'} ${value.toFixed(2).padStart(5)}:1  ${fg} на ${bg} — ${what}`
  );
}

if (failed) {
  console.error(`\n${failed} пар не проходят 4.5:1. Правьте tokens.ts.`);
  process.exit(1);
}
console.log(`\nВсе ${pairs.length} пар проходят 4.5:1.`);
