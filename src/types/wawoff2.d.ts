/**
 * У wawoff2 нет собственных типов, а нужен из него ровно один вызов.
 *
 * Пакет — обёртка над Emscripten-модулем и возвращает Uint8Array, поэтому
 * подпись пишется руками, а не тянется @types-пакетом, которого не существует.
 */
declare module 'wawoff2' {
  export function decompress(input: Uint8Array): Promise<Uint8Array>;
  export function compress(input: Uint8Array): Promise<Uint8Array>;
}
