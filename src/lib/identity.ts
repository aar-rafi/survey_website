import { v4 as uuidv4 } from 'uuid';

const COOKIE_NAME = 'survey_uuid';
const TOKEN_NAME = 'survey_token';

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export function setCookie(name: string, value: string, days: number): void {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

export function getOrCreateIdentity(): string {
  let uuid = getCookie(COOKIE_NAME);
  if (!uuid) {
    uuid = uuidv4();
    setCookie(COOKIE_NAME, uuid, 365); // Cookie expires in 1 year
  }
  return uuid;
}

export function getOrCreateFormToken(): string {
  let token = sessionStorage.getItem(TOKEN_NAME);
  if (!token) {
    token = uuidv4();
    sessionStorage.setItem(TOKEN_NAME, token);
  }
  return token;
}