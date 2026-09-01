/**
 * Фавиконка.
 *
 * Собирается из палитры, а не лежит файлом: цвет знака должен меняться там
 * же, где остальные цвета — в tokens.ts. Отдельный .svg в /public про это
 * забыли бы при первой же правке фирменного цвета.
 *
 * Марка та же, что в логотипе, но упрощена: на 16×16 проём и толщина линии
 * логотипа сливаются в пятно, поэтому здесь фронтон залит целиком.
 */
import type { APIRoute } from 'astro';
import { palette } from '../config/tokens';

export const GET: APIRoute = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${palette.ink}"/>
  <path d="M5 15.6 16 7.2l11 8.4V25a1 1 0 0 1-1 1h-6.2v-6.6h-3.6V26H6a1 1 0 0 1-1-1V15.6Z" fill="${palette.accentOnInk}"/>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
