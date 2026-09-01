// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Демо живёт на своём поддомене и стоит в корне:
 * https://grandhouse.manath.site/
 *
 * base — префикс пути ко всем ассетам. На github.io сайт лежал в подпапке
 * репозитория, и префикс был /grand-house-template. На собственном домене
 * он в корне, и тот же префикс превращает каждый шрифт и каждую фотографию
 * в 404: страница открывается голым HTML без стилей и картинок.
 *
 * Значения приходят из окружения — в workflow их подставляет
 * actions/configure-pages, который знает про настроенный домен.
 *
 *   SITE_URL=https://manath-iq.github.io SITE_BASE=/grand-house-template npm run build
 *
 * Через ?? , а не через || . Для домена в корне configure-pages отдаёт
 * base_path пустой строкой, а пустая строка ложна — с || префикс молча
 * возвращался бы к подпапке, и сборка снова уехала бы в 404. Ровно это
 * и произошло при первом переезде на поддомен.
 */
const site = process.env.SITE_URL ?? 'https://grandhouse.manath.site';
const base = process.env.SITE_BASE ? process.env.SITE_BASE : '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    // Мелкие стили инлайнятся в <head>: меньше блокирующих запросов на LCP.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 2048,
    },
  },
});
