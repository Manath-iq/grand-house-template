/**
 * Типы данных компании.
 *
 * Всё, что относится к конкретной компании — название, телефоны, проекты,
 * цены, отзывы — описано здесь и живёт в src/config/client.ts.
 * В компонентах не должно быть ни одного захардкоженного значения.
 */

export type Technology = 'керамоблок' | 'газоблок' | 'кирпич';

/** Комплектация: три уровня готовности дома. */
export type PackageKey = 'shell' | 'turnkey' | 'finished';

export interface Brand {
  /** Короткое название для шапки. */
  name: string;
  /** Юридическое лицо для футера. */
  legal: string | null;
  /** ОГРН из ЕГРЮЛ. null — реквизит не подтверждён, футер покажет заглушку. */
  ogrn: string | null;
  /** ИНН из ЕГРЮЛ. null — реквизит не подтверждён. */
  inn: string | null;
  /**
   * Предварительный макет, а не боевой сайт компании.
   *
   * Включает строку-оговорку в подвале и noindex в <head>. Снимается только
   * после того, как компания подтвердит данные и сайт переедет на свой домен.
   */
  draft: boolean;
}

export interface Contacts {
  /** Человекочитаемый вид: +7 937 009-60-00 */
  phone: string;
  /** Только цифры, для tel: и wa.me */
  phoneRaw: string;
  /** Второй номер. null — если он один. */
  phoneAlt: string | null;
  phoneAltRaw: string | null;
  whatsapp: string | null;
  telegram: string | null;
  email: string | null;
  address: string;
  workHours: string;
  /** Карточка в справочнике: единственное публичное подтверждение рейтинга. */
  mapCard: MapRating | null;
}

export interface MapRating {
  source: string;
  rating: number;
  count: number;
  href: string;
}

export interface SiteMeta {
  /** Полный адрес с протоколом, без слэша в конце. */
  url: string;
  title: string;
  description: string;
  /** Регион в предложном падеже для микроразметки и подзаголовков. */
  region: string;
  policyUpdatedAt: string;
}

export interface Hero {
  /** Формула: что строим + из чего + где. Без «строим дома под ключ». */
  headline: string;
  /** Одна строка: что входит в цену. */
  sub: string;
  image: string;
  imageAlt: string;
}

export interface Stat {
  value: string;
  label: string;
  /** Пояснение под цифрой, если она требует расшифровки. */
  note?: string;
}

/** Блок «почему камень» — их собственное позиционирование против каркаса. */
export interface MaterialPoint {
  title: string;
  text: string;
  /** Короткая цифра-подпись: срок службы, теплопроводность. */
  figure: string;
  figureNote: string;
}

export interface Project {
  slug: string;
  name: string;
  /** Одна строка: чем этот проект отличается. */
  tagline: string;
  area: number;
  floors: 1 | 2;
  beds: number;
  /** Срок в месяцах числом — чтобы можно было сортировать и фильтровать. */
  termMonths: number;
  /** Цена «от», в рублях, за указанную комплектацию. */
  price: number;
  priceFor: PackageKey;
  tech: Technology;
  image: string;
  imageAlt: string;
  plan: string;
  features: string[];
}

export interface PackageColumn {
  key: PackageKey;
  name: string;
  /** Приписка под названием: «стены, кровля, окна». */
  tagline: string;
  pricePerM2: number;
  /** Рекомендуемая колонка — визуально выделяется. */
  highlighted?: boolean;
}

/** true — входит, false — не входит, строка — входит с оговоркой. */
export type PackageCell = boolean | string;

export interface PackageRow {
  label: string;
  values: Record<PackageKey, PackageCell>;
}

export interface Stage {
  /** Номер слоя схемы дома. Должны идти 1..5 без пропусков. */
  layer: 1 | 2 | 3 | 4 | 5;
  title: string;
  term: string;
  /** Доля оплаты в процентах. Сумма по всем этапам должна давать ровно 100. */
  payment: number;
  text: string;
  /** Что заказчик получает на руки по завершении этапа. */
  deliverable: string;
}

export interface SafetyItem {
  title: string;
  text: string;
  /**
   * Показывать пункт или нет.
   *
   * Не украшение: эскроу и аккредитация в банке есть не у всех подрядчиков,
   * а заявить их и не иметь — хуже, чем не заявлять.
   */
  enabled: boolean;
}

export interface MortgageProgram {
  id: string;
  name: string;
  /** Годовая ставка в процентах. Меняется несколько раз в год. */
  rate: number;
  /** Минимальный первоначальный взнос, доля от стоимости. */
  minDownPayment: number;
  /** Потолок суммы кредита, ₽. null — без потолка. */
  maxLoan: number | null;
  maxYears: number;
  /** Кому подходит — одна строка. */
  who: string;
  enabled: boolean;
}

export interface Finance {
  programs: MortgageProgram[];
  /** Размер материнского капитала, ₽. null — не показывать переключатель. */
  maternityCapital: number | null;
  /** Дата, на которую проверялись ставки. Выводится сноской. */
  ratesCheckedAt: string;
  /** Сноска про источник цифр. */
  ratesNote: string;
}

export interface BuiltObject {
  place: string;
  area: number;
  year: number;
  term: string;
  tech: Technology;
}

/**
 * Роль на стройке, а не конкретный человек.
 *
 * Сознательно без имён и фамилий. Выдуманный сотрудник с именем и лицом —
 * самое проверяемое враньё на странице: достаточно спросить «а кто это?».
 * Роль с зоной ответственности очеловечивает компанию не хуже, а подставить
 * настоящих людей потом — это правка одного поля.
 */
export interface CrewRole {
  role: string;
  /** За что отвечает и где заказчик с ним пересекается. */
  text: string;
}

export interface Review {
  /** Имя или инициалы. Фамилий несуществующих людей не пишем. */
  author: string;
  /** Что за объект — привязывает отзыв к реальности. */
  object: string;
  text: string;
  rating: number;
  date: string;
  /**
   * Отзыв-образец, а не настоящий.
   *
   * Карточка получает видимую пометку. В макете, который уходит компании,
   * все отзывы — образцы: настоящие лежат в 2ГИС и переносятся оттуда
   * вместе с ссылкой на источник.
   */
  sample: boolean;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface QuizOption {
  value: string;
  label: string;
  hint?: string;
}

export interface QuizStep {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface Lead {
  /**
   * Куда уходит заявка.
   *
   * Бэкенда у статики нет. Пустой endpoint означает, что заявка открывает
   * wa.me с готовым текстом — рабочий минимум без единой строчки сервера.
   * Токен Telegram-бота в браузер класть нельзя: в собранном сайте любой ключ
   * в JS виден всем. Между сайтом и ботом ставится функция на Cloudflare
   * Workers, её адрес и становится endpoint.
   */
  endpoint: string | null;
  subject: string;
}

export interface ClientConfig {
  brand: Brand;
  contacts: Contacts;
  site: SiteMeta;
  hero: Hero;
  stats: Stat[];
  material: { title: string; lead: string; points: MaterialPoint[] };
  projects: Project[];
  packages: { columns: PackageColumn[]; rows: PackageRow[] };
  stages: Stage[];
  safety: SafetyItem[];
  finance: Finance;
  built: BuiltObject[];
  crew: { title: string; lead: string; roles: CrewRole[] };
  reviews: Review[];
  faq: FaqItem[];
  quiz: QuizStep[];
  lead: Lead;
}
