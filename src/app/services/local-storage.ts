export interface StoredUser {
  email: string;
  username: string;
  regions: string[];
  score: number;
  certificate: boolean;
  passwordHash?: string;
}

export interface AuthTokenMap {
  access: Record<string, string>;
  refresh: Record<string, string>;
}

const USERS_KEY = 'pokewordle_users';
const TOKENS_KEY = 'pokewordle_tokens';
const CURRENT_EMAIL_KEY = 'pokewordle_current_email';
const SECRET_SALT = 'p0kew0rdl3_secret';

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function normalizeName(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

export function loadUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

export function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadTokens(): AuthTokenMap {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return { access: {}, refresh: {} };

  try {
    return JSON.parse(raw) as AuthTokenMap;
  } catch {
    return { access: {}, refresh: {} };
  }
}

export function saveTokens(tokens: AuthTokenMap): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function hashPassword(password: string, email: string): string {
  const normalized = normalizeEmail(email);
  const text = `${password}|${normalized}|${SECRET_SALT}`;
  let hash = 0;
  for (const ch of text) {
    hash = Math.imul(31, hash) + ch.charCodeAt(0);
    hash |= 0;
  }
  return `v${Math.abs(hash).toString(36)}:${text.length}`;
}

export function setCurrentEmail(email: string | null): void {
  if (email) {
    localStorage.setItem(CURRENT_EMAIL_KEY, normalizeEmail(email));
  } else {
    localStorage.removeItem(CURRENT_EMAIL_KEY);
  }
}

export function getCurrentEmail(): string | null {
  return localStorage.getItem(CURRENT_EMAIL_KEY);
}

export function findUserByEmail(email: string): StoredUser | null {
  const normalized = normalizeEmail(email);
  return loadUsers().find((user) => normalizeEmail(user.email) === normalized) ?? null;
}
