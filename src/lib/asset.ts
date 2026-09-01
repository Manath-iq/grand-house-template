/**
 * Путь к файлу в /public с учётом префикса развёртывания.
 *
 * На GitHub Pages сайт лежит в подпапке, и голый «/media/hero.webp» там
 * отдаёт 404. BASE_URL подставляет Astro из конфига, поэтому один и тот же
 * код работает и в подпапке демо, и в корне боевого домена.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
