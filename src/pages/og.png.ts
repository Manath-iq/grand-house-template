/**
 * Превью ссылки, /og.png.
 *
 * Ссылку на макет кидают в WhatsApp — там происходит первое касание.
 * Карточка с названием компании и телефоном открывается заметно охотнее,
 * чем голый домен, поэтому картинка собирается из конфига на сборке,
 * а не рисуется руками под каждую правку заголовка.
 *
 * Четыре грабли resvg, на которые здесь потрачено время:
 *
 *  1. woff2 он не читает вовсе. Шрифты распаковываются в ttf через wawoff2.
 *
 *  2. Поле fontBuffers молча игнорируется — текст уезжает в системный serif.
 *     Работает только fontFiles, поэтому ttf кладутся на диск и передаются
 *     путями.
 *
 *  3. Распаковка идёт строго последовательно. wawoff2 — обёртка над
 *     Emscripten-модулем с общей памятью, и параллельные вызовы затирают
 *     друг другу вывод: файлы получаются правильного размера, но с битыми
 *     таблицами. Внешне это «шрифт не подхватился» — весь текст в квадратах.
 *
 *  4. Вариативные шрифты он не инстанцирует: берёт начертание по умолчанию
 *     и игнорирует font-weight. У Geologica по умолчанию Thin — заголовок
 *     превью выходил волосяным. Поэтому для превью подключены отдельные
 *     статические файлы @fontsource/*, а вариативные остаются сайту.
 *
 * И главное: сопоставлять шрифт resvg умеет только по имени семейства внутри
 * ttf, а оно не совпадает с тем, что объявлено в CSS, и включает вес —
 * «Onest SemiBold», «Geologica Thin Roman SemiBold». Захардкодить эти строки
 * нельзя: Fontsource их меняет между версиями, и превью тихо уехало бы
 * в запасной шрифт. Поэтому имя читается прямо из таблицы name.
 */
import type { APIRoute } from 'astro';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { client, derived } from '../config';
import { palette } from '../config/tokens';
import { money } from '../lib/format';

const W = 1200;
const H = 630;

/** Кириллица и latin-ext обязательны: без первой не будет текста, без второй — ₽. */
const SUBSETS = ['cyrillic', 'latin', 'latin-ext'];

const ROLES = [
  { role: 'display', pkg: 'geologica', weight: '600' },
  { role: 'body', pkg: 'onest', weight: '400' },
  { role: 'mono', pkg: 'martian-mono', weight: '500' },
] as const;

type Role = (typeof ROLES)[number]['role'];

/** Достаёт имя семейства (nameID 1) из таблицы name. */
function familyName(buf: Buffer): string {
  const numTables = buf.readUInt16BE(4);
  let nameOff: number | null = null;
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    if (buf.toString('ascii', o, o + 4) === 'name') nameOff = buf.readUInt32BE(o + 8);
  }
  if (nameOff === null) throw new Error('В шрифте нет таблицы name — resvg его не сопоставит.');

  const count = buf.readUInt16BE(nameOff + 2);
  const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
  for (let i = 0; i < count; i++) {
    const r = nameOff + 6 + i * 12;
    const platformId = buf.readUInt16BE(r);
    const nameId = buf.readUInt16BE(r + 6);
    if (nameId !== 1) continue;
    const len = buf.readUInt16BE(r + 8);
    const off = buf.readUInt16BE(r + 10);
    const raw = Buffer.from(buf.subarray(strOff + off, strOff + off + len));
    // Платформа 3 (Windows) пишет UTF-16BE, остальные — однобайтово.
    const value = platformId === 3 ? raw.swap16().toString('utf16le') : raw.toString('latin1');
    const clean = [...value].filter((c) => c.charCodeAt(0) > 31).join('');
    if (clean) return clean;
  }
  throw new Error('В таблице name нет имени семейства.');
}

async function prepareFonts(): Promise<{ files: string[]; families: Record<Role, string> }> {
  const out = join(process.cwd(), '.cache', 'og-fonts');
  mkdirSync(out, { recursive: true });

  const files: string[] = [];
  const families = {} as Record<Role, string>;

  for (const { role, pkg, weight } of ROLES) {
    for (const subset of SUBSETS) {
      const name = `${pkg}-${subset}-${weight}-normal`;
      const ttfPath = join(out, `${name}.ttf`);

      let ttf: Buffer;
      if (existsSync(ttfPath)) {
        ttf = readFileSync(ttfPath);
      } else {
        const woff2 = readFileSync(
          join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', `${name}.woff2`)
        );
        ttf = Buffer.from(await decompress(woff2));
        writeFileSync(ttfPath, ttf);
      }

      files.push(ttfPath);
      // Имя одинаково у всех субсетов одного веса — берём из первого.
      if (!families[role]) families[role] = familyName(ttf);
    }
  }

  return { files, families };
}

/** & < > из конфига ломают SVG молча — картинка просто не собирается. */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Перенос по словам.
 *
 * Ширина считается по количеству знаков, а не по метрикам шрифта: заголовок
 * здесь один и меняется раз в полгода, а тянуть в сборку измеритель текста
 * ради него несоразмерно.
 */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && `${line} ${word}`.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const GET: APIRoute = async () => {
  const { files: fontFiles, families } = await prepareFonts();

  const headline = wrap(client.hero.headline, 26);
  const sub = wrap(client.hero.sub, 62).slice(0, 2);
  const rating = client.contacts.mapCard;

  const figures = [
    { value: money(derived.minPrice), label: 'дом под ключ' },
    { value: `${derived.minTerm}–${derived.maxTerm} мес`, label: 'срок строительства' },
    ...(rating
      ? [
          {
            value: rating.rating.toFixed(1).replace('.', ','),
            label: `рейтинг в ${rating.source}`,
          },
        ]
      : []),
  ];

  /**
   * Заголовок центрируется в полосе между логотипом и показателями.
   *
   * Прижимать его к низу нельзя: при двух строках подзаголовка блок
   * наползает на логотип. Считать от верха тоже нельзя: при одной строке
   * заголовка внизу открывается заметная дыра. Границы полосы заданы
   * числами, потому что логотип и показатели стоят на фиксированных
   * позициях и от длины текста не зависят.
   */
  const TOP_EDGE = 168;
  const BOTTOM_EDGE = H - 160;
  const SUB_GAP = 52;
  // От первой базовой линии заголовка до последней базовой линии подзаголовка.
  const blockH = (headline.length - 1) * 74 + SUB_GAP + (sub.length - 1) * 30;
  const headlineTop = Math.round(
    TOP_EDGE + Math.max(0, (BOTTOM_EDGE - TOP_EDGE - blockH) / 2)
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${palette.paper}"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${palette.accent}"/>

  <g transform="translate(72, 92)">
    <path d="M0 20 L15 8 L30 20 L30 38 A2 2 0 0 1 28 40 L2 40 A2 2 0 0 1 0 38 Z"
          fill="none" stroke="${palette.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="46" y="32" font-family="${families.display}" font-size="27"
          letter-spacing="1.5" fill="${palette.ink}">${esc(client.brand.name.toUpperCase())}</text>
  </g>

  <g transform="translate(72, ${headlineTop})">
    ${headline
      .map(
        (line, i) =>
          `<text x="0" y="${i * 74}" font-family="${families.display}" font-size="64" letter-spacing="-1.8" fill="${palette.ink}">${esc(line)}</text>`
      )
      .join('\n    ')}
    ${sub
      .map(
        (line, i) =>
          `<text x="0" y="${(headline.length - 1) * 74 + SUB_GAP + i * 30}" font-family="${families.body}" font-size="22" fill="${palette.muted}">${esc(line)}</text>`
      )
      .join('\n    ')}
  </g>

  <g transform="translate(72, ${H - 118})">
    ${figures
      .map(
        (f, i) =>
          `<g transform="translate(${i * 258}, 0)">
      <text x="0" y="0" font-family="${families.mono}" font-size="28" fill="${palette.ink}">${esc(f.value)}</text>
      <text x="0" y="30" font-family="${families.body}" font-size="19" fill="${palette.muted}">${esc(f.label)}</text>
    </g>`
      )
      .join('\n    ')}
  </g>

  <text x="${W - 72}" y="${H - 90}" text-anchor="end" font-family="${families.mono}"
        font-size="26" fill="${palette.accent}">${esc(client.contacts.phone)}</text>
  <text x="${W - 72}" y="${H - 58}" text-anchor="end" font-family="${families.body}"
        font-size="19" fill="${palette.muted}">Набережные Челны</text>
</svg>`;

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: {
      // Системные шрифты выключены намеренно: на машине сборщика набор другой,
      // и молчаливая подмена дала бы разное превью на разных машинах.
      loadSystemFonts: false,
      fontFiles,
      defaultFontFamily: families.body,
    },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
