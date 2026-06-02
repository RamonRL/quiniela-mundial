/**
 * Constantes y validación compartidas entre cliente y servidor para la
 * identidad del jugador en minijuegos. Este archivo NO debe importar nada
 * de Node/DB — lo consumen también componentes cliente (modal de apodo).
 * La lógica server-only vive en `./identity-server.ts`.
 */

export const GUEST_NICKNAME_STORAGE_KEY = "minijuegos:nickname";
export const NICKNAME_MIN_LEN = 2;
export const NICKNAME_MAX_LEN = 20;
export const NICKNAME_REGEX = /^[\p{L}\p{N} _-]{2,20}$/u;
