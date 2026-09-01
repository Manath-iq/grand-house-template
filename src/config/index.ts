/**
 * Точка входа для данных компании: проверка на этапе сборки и производные.
 *
 * Проверки нужны потому, что противоречивый конфиг ломается тихо. Страница
 * соберётся и с долями оплаты на 95%, и с пропущенным слоем схемы дома —
 * заметит это уже получатель ссылки. Лучше уронить сборку.
 */
import { client } from './client';
import type { PackageKey } from './types';

/* ── Проверки ─────────────────────────────────────────────────────────── */

const paymentsTotal = client.stages.reduce((sum, s) => sum + s.payment, 0);
if (paymentsTotal !== 100) {
  throw new Error(
    `Доли оплаты по этапам дают ${paymentsTotal}%, а должны 100%. ` +
      `Страница показала бы заказчику схему платежей, которая не сходится.`
  );
}

const layers = client.stages.map((s) => s.layer);
const expected = layers.map((_, i) => i + 1);
if (layers.length !== expected.length || layers.some((l, i) => l !== expected[i])) {
  throw new Error(
    `Слои этапов должны идти 1..${client.stages.length} без пропусков, сейчас [${layers.join(', ')}]. ` +
      `Иначе схема дома соберётся не полностью.`
  );
}

const columnKeys = client.packages.columns.map((c) => c.key);
for (const row of client.packages.rows) {
  for (const key of columnKeys) {
    if (!(key in row.values)) {
      throw new Error(`В строке комплектаций «${row.label}» нет значения для колонки «${key}».`);
    }
  }
}

for (const project of client.projects) {
  if (!project.price) {
    throw new Error(
      `У проекта ${project.name} нет цены. Отсутствие цены — убийца конверсии номер один в этой нише: ` +
        `человек уходит сравнивать к тому, у кого цена есть.`
    );
  }
  if (!columnKeys.includes(project.priceFor)) {
    throw new Error(`У проекта ${project.name} priceFor = «${project.priceFor}», такой комплектации нет.`);
  }
}

/* Боевой сайт без реквизитов в подвале теряет главный сигнал доверия
   в этой нише: мошенники ОГРН и ИНН не пишут. В макете их нет намеренно,
   поэтому проверка срабатывает только при снятом флаге draft. */
if (!client.brand.draft && (!client.brand.ogrn || !client.brand.inn)) {
  throw new Error(
    'Флаг brand.draft снят, но ОГРН или ИНН не заполнены. ' +
      'Либо заполните реквизиты, либо оставьте макет макетом.'
  );
}

const enabledPrograms = client.finance.programs.filter((p) => p.enabled);
for (const program of enabledPrograms) {
  if (!program.rate) {
    throw new Error(
      `Программа «${program.name}» включена, но ставка равна нулю. ` +
        `Непроверенную ставку показывать нельзя — её сверяют в банке.`
    );
  }
}

/* ── Производные ──────────────────────────────────────────────────────── */

/**
 * Цифры первого экрана считаются из каталога, а не пишутся руками.
 * Так они физически не могут разойтись с карточками проектов — а расхождение
 * «в шапке от 5 млн, в каталоге от 6» замечают сразу и читают как обман.
 */
export const derived = {
  minPrice: Math.min(...client.projects.map((p) => p.price)),
  minTerm: Math.min(...client.projects.map((p) => p.termMonths)),
  maxTerm: Math.max(...client.projects.map((p) => p.termMonths)),
  minArea: Math.min(...client.projects.map((p) => p.area)),
  maxArea: Math.max(...client.projects.map((p) => p.area)),
  technologies: [...new Set(client.projects.map((p) => p.tech))],
  packageName: (key: PackageKey) =>
    client.packages.columns.find((c) => c.key === key)?.name ?? key,
  mortgagePrograms: enabledPrograms,
  safetyItems: client.safety.filter((s) => s.enabled),
};

export { client };
export type { ClientConfig } from './types';
