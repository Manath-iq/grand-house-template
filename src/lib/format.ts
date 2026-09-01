/**
 * Форматирование чисел и денег.
 *
 * Всё через Intl с явной локалью ru-RU: без неё сборка на сервере в другой
 * локали отдала бы «5,040,000» вместо «5 040 000», и это заметно.
 */

const RUB = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/** 5040000 → «5 040 000 ₽» */
export function money(value: number): string {
  // Intl ставит неразрывный пробел перед знаком — так и надо: цена не должна
  // переноситься по строке отдельно от рубля.
  return RUB.format(value);
}

/** 5040000 → «5,04 млн ₽». Для мест, где важна не точность, а порядок. */
export function moneyShort(value: number): string {
  const mln = value / 1_000_000;
  const digits = mln >= 10 ? 1 : 2;
  return `${mln.toFixed(digits).replace('.', ',')} млн ₽`;
}

export function num(value: number): string {
  return NUM.format(value);
}

/** 84 → «84 м²» */
export function area(value: number): string {
  return `${NUM.format(value)} м²`;
}

/** 1 → «1 этаж», 2 → «2 этажа» */
export function floors(value: number): string {
  return `${value} ${plural(value, 'этаж', 'этажа', 'этажей')}`;
}

/** 3 → «3 спальни» */
export function beds(value: number): string {
  return `${value} ${plural(value, 'спальня', 'спальни', 'спален')}`;
}

/** 6 → «6 месяцев» */
export function months(value: number): string {
  return `${value} ${plural(value, 'месяц', 'месяца', 'месяцев')}`;
}

/**
 * Русское склонение по числу.
 *
 * Нужно потому, что «5 месяца» и «21 месяцев» читаются как машинный перевод,
 * а страница продаёт дом за восемь миллионов.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/**
 * Аннуитетный платёж.
 *
 * Формула держится в коде, а ставки и лимиты — в конфиге: программы меняются
 * несколько раз в год, и переписывать ради этого вёрстку никто не станет.
 *
 * @param principal сумма кредита, ₽
 * @param annualRate годовая ставка в процентах
 * @param years срок в годах
 */
export function annuity(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const months = years * 12;
  // Беспроцентный кредит: общая формула здесь делится на ноль.
  if (annualRate <= 0) return principal / months;
  const rate = annualRate / 100 / 12;
  const factor = Math.pow(1 + rate, months);
  return (principal * rate * factor) / (factor - 1);
}
