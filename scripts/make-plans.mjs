/**
 * Чертёжные планировки в SVG.
 *
 * Планировки сознательно не генерируются картинкой: у диффузионной модели
 * план выходит с комнатами без выходов, дверями в никуда и подписями из
 * несуществующих букв. Строитель это замечает за секунду, и вместе с планом
 * теряет доверие ко всей странице.
 *
 * Здесь план собирается из спецификации помещений, поэтому площади в подписях
 * не могут разойтись с геометрией: они из неё и посчитаны.
 *
 * Раскладка простая — дом делится на вертикальные полосы, полоса делится на
 * помещения по горизонтали. Этого достаточно для схемы: задача плана на
 * лендинге — показать сценарий, а не выдать рабочую документацию.
 *
 *   npm run plans
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'media');
mkdirSync(outDir, { recursive: true });

/* Цвета читаются из tokens.ts, а не дублируются здесь: правило «ни одного
   хекса вне tokens.ts» действует и на скрипты, иначе при смене фирменного
   цвета планировки останутся в старом. */
const tokensSrc = readFileSync(join(root, 'src', 'config', 'tokens.ts'), 'utf8');
function token(name) {
  const match = tokensSrc.match(new RegExp(`${name}:\\s*'(#[0-9A-Fa-f]{6})'`));
  if (!match) throw new Error(`В tokens.ts нет цвета ${name}.`);
  return match[1];
}
const INK = token('ink');
const MUTED = token('muted');
const ACCENT = token('accent');
const PAPER = token('paper');

/** Толщина несущей стены в метрах — рисуется двойным контуром. */
const WALL = 0.4;
/** Ширина дверного проёма: разрыв в перегородке. */
const DOOR = 0.9;
/** Пикселей на метр. */
const SCALE = 38;
const PAD = 46;

/**
 * Планы первого этажа.
 *
 * У двухэтажных проектов площадь этажа меньше общей: наверху спальни.
 * Сумма помещений по полосам сходится с габаритом — это проверяется ниже
 * и роняет скрипт при расхождении больше 0,1 м².
 */
const PLANS = [
  {
    slug: 'gh-84',
    floor: '1 этаж',
    w: 10.5,
    h: 8.0,
    cols: [
      { w: 3.0, rooms: [['Тамбур', 2.0], ['Санузел', 2.4], ['Спальня', 3.6]] },
      { w: 4.5, rooms: [['Кухня-гостиная', 5.4], ['Холл', 2.6]] },
      { w: 3.0, rooms: [['Спальня', 4.4], ['Гардероб', 1.4], ['Котельная', 2.2]] },
    ],
  },
  {
    slug: 'gh-112',
    floor: '1 этаж',
    w: 14.0,
    h: 8.0,
    cols: [
      { w: 4.0, rooms: [['Спальня', 4.0], ['Спальня', 4.0]] },
      { w: 6.0, rooms: [['Кухня-гостиная', 5.5], ['Холл', 2.5]] },
      { w: 4.0, rooms: [['Спальня', 3.5], ['Санузел', 2.0], ['Гардероб', 1.2], ['Котельная', 1.3]] },
    ],
  },
  {
    slug: 'gh-134',
    floor: '1 этаж',
    w: 10.0,
    h: 7.4,
    cols: [
      { w: 3.4, rooms: [['Тамбур', 2.0], ['Санузел', 2.2], ['Котельная', 3.2]] },
      { w: 6.6, rooms: [['Кухня-гостиная', 5.0], ['Холл, лестница', 2.4]] },
    ],
  },
  {
    slug: 'gh-158',
    floor: '1 этаж',
    w: 11.0,
    h: 8.0,
    cols: [
      { w: 3.5, rooms: [['Тамбур', 1.8], ['Гардероб', 1.6], ['Санузел', 2.2], ['Котельная', 2.4]] },
      { w: 4.5, rooms: [['Кухня-гостиная', 5.2], ['Холл, лестница', 2.8]] },
      { w: 3.0, rooms: [['Кабинет', 3.6], ['Спальня', 4.4]] },
    ],
  },
  {
    slug: 'gh-186',
    floor: '1 этаж',
    w: 12.0,
    h: 8.5,
    cols: [
      { w: 3.6, rooms: [['Тамбур', 2.0], ['Санузел', 2.3], ['Котельная', 2.4], ['Кладовая', 1.8]] },
      { w: 5.2, rooms: [['Кухня-гостиная', 5.6], ['Холл, лестница', 2.9]] },
      { w: 3.2, rooms: [['Кабинет', 4.0], ['Спальня', 4.5]] },
    ],
  },
  {
    slug: 'gh-224',
    floor: '1 этаж',
    w: 13.5,
    h: 9.2,
    cols: [
      { w: 4.0, rooms: [['Тамбур', 2.2], ['Гардероб', 1.8], ['Санузел', 2.4], ['Котельная', 2.8]] },
      { w: 5.8, rooms: [['Кухня-гостиная', 6.0], ['Холл, лестница', 3.2]] },
      { w: 3.7, rooms: [['Кабинет', 4.2], ['Спальня', 5.0]] },
    ],
  },
];

const fmt = (n) => n.toFixed(1).replace('.', ',').replace(',0', '');
const px = (m) => +(m * SCALE).toFixed(1);

function build(plan) {
  const { w, h, cols } = plan;

  /* Спецификация — единственный источник геометрии, поэтому она должна
     сходиться. Молча растянутый план хуже упавшего скрипта: расхождение
     видно только тому, кто станет считать, и это будет заказчик. */
  const colSum = cols.reduce((s, c) => s + c.w, 0);
  if (Math.abs(colSum - w) > 0.05) {
    throw new Error(`${plan.slug}: полосы дают ${colSum} м при габарите ${w} м.`);
  }
  for (const col of cols) {
    const roomSum = col.rooms.reduce((s, r) => s + r[1], 0);
    if (Math.abs(roomSum - h) > 0.05) {
      throw new Error(`${plan.slug}: помещения полосы дают ${roomSum} м при высоте ${h} м.`);
    }
  }

  const W = px(w) + PAD * 2;
  const H = px(h) + PAD * 2 + 40;

  const parts = [];
  const labels = [];
  let total = 0;

  // ── Несущая стена: внешний и внутренний контур ─────────────────────────
  parts.push(
    `<rect x="${PAD}" y="${PAD}" width="${px(w)}" height="${px(h)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
    `<rect x="${PAD + px(WALL)}" y="${PAD + px(WALL)}" width="${px(w - WALL * 2)}" height="${px(h - WALL * 2)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`
  );

  let x = 0;
  cols.forEach((col, ci) => {
    // Перегородка между полосами, с разрывом под дверь по центру.
    if (ci > 0) {
      const lineX = PAD + px(x);
      const gapMid = PAD + px(h / 2);
      const gap = px(DOOR) / 2;
      parts.push(
        `<line x1="${lineX}" y1="${PAD + px(WALL)}" x2="${lineX}" y2="${gapMid - gap}" stroke="${INK}" stroke-width="1"/>`,
        `<line x1="${lineX}" y1="${gapMid + gap}" x2="${lineX}" y2="${PAD + px(h - WALL)}" stroke="${INK}" stroke-width="1"/>`
      );
    }

    let y = 0;
    col.rooms.forEach(([name, roomH], ri) => {
      const areaM2 = col.w * roomH;
      total += areaM2;

      // Перегородка между помещениями полосы, тоже с проёмом.
      if (ri > 0) {
        const lineY = PAD + px(y);
        const gapMid = PAD + px(x + col.w / 2);
        const gap = px(DOOR) / 2;
        /* Перегородка упирается во внутренний контур несущей стены, а не
           в наружный: иначе у крайних полос тонкая линия перечёркивает
           толщину стены, и на чертеже это читается как ошибка. */
        const from = PAD + px(Math.max(x, WALL));
        const to = PAD + px(Math.min(x + col.w, w - WALL));
        parts.push(
          `<line x1="${from}" y1="${lineY}" x2="${gapMid - gap}" y2="${lineY}" stroke="${INK}" stroke-width="1"/>`,
          `<line x1="${gapMid + gap}" y1="${lineY}" x2="${to}" y2="${lineY}" stroke="${INK}" stroke-width="1"/>`
        );
      }

      const cx = PAD + px(x + col.w / 2);
      const cy = PAD + px(y + roomH / 2);
      labels.push(
        `<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="Onest, sans-serif" font-size="11" fill="${INK}">${name}</text>`,
        `<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="${MUTED}">${fmt(areaM2)} м²</text>`
      );

      y += roomH;
    });

    x += col.w;
  });

  // ── Размерная линия снизу ──────────────────────────────────────────────
  const dimY = PAD + px(h) + 26;
  parts.push(
    `<line x1="${PAD}" y1="${dimY}" x2="${PAD + px(w)}" y2="${dimY}" stroke="${MUTED}" stroke-width="0.8"/>`,
    `<line x1="${PAD}" y1="${dimY - 4}" x2="${PAD}" y2="${dimY + 4}" stroke="${MUTED}" stroke-width="0.8"/>`,
    `<line x1="${PAD + px(w)}" y1="${dimY - 4}" x2="${PAD + px(w)}" y2="${dimY + 4}" stroke="${MUTED}" stroke-width="0.8"/>`
  );
  labels.push(
    `<text x="${PAD + px(w) / 2}" y="${dimY - 8}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="${MUTED}">${fmt(w)} м</text>`,
    `<text x="${PAD}" y="${PAD - 16}" font-family="ui-monospace, monospace" font-size="11" fill="${ACCENT}">${plan.floor.toUpperCase()} · ${fmt(total)} м²</text>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Планировка ${plan.slug}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${parts.join('\n  ')}
  ${labels.join('\n  ')}
</svg>
`;
}

for (const plan of PLANS) {
  writeFileSync(join(outDir, `plan-${plan.slug}.svg`), build(plan));
}
console.log(`Планировки: ${PLANS.length} шт. в public/media/`);
