// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Демо живёт на GitHub Pages в подпапке репозитория:
 * https://manath-iq.github.io/grand-house-template/
 *
 * Отсюда base — префикс пути ко всем ассетам. Захардкодить его нельзя
 * навсегда: когда Grand House заведёт свой домен, сайт переедет в корень,
 * и с префиксом /grand-house-template/ все шрифты и фотографии отдали бы 404.
 * Поэтому оба значения читаются из окружения, а значения по умолчанию —
 * текущий адрес демо.
 *
 *   SITE_URL=https://grandhouse.ru SITE_BASE=/ npm run build
 */
const site = process.env.SITE_URL || 'https://manath-iq.github.io';
const base = process.env.SITE_BASE || '/grand-house-template';

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
