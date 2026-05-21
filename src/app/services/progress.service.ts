import { Injectable } from '@angular/core';

export interface ProgressState {
  version: number;
  username: string;
  regions: string[];
  score: number;
  certificate: boolean;
}

const STORAGE_KEY = 'pokewordle_progress';
const SECRET = String.fromCharCode(
  112, 111, 107, 101, 119, 111, 114, 100, 108, 101,
  95, 111, 98, 102, 117, 115, 99, 97, 116, 105,
  111, 110, 95, 115, 101, 99, 114, 101, 116, 95,
  118, 49
);

function normalizeRegion(region: string): string {
  return String(region || '').trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return String(username || '').trim();
}

function stableHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36).padStart(8, '0');
}

function base64urlEncode(value: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    const encoded = window.btoa(unescape(encodeURIComponent(value)));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  throw new Error('Base64 encoding is not available in this environment');
}

function base64urlDecode(value: string): string {
  let encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = encoded.length % 4;
  if (pad === 2) encoded += '==';
  if (pad === 3) encoded += '=';
  if (pad === 1) throw new Error('Invalid code');
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const decoded = window.atob(encoded);
    return decodeURIComponent(escape(decoded));
  }
  throw new Error('Base64 decoding is not available in this environment');
}

function encodePayload(payload: string): string {
  return base64urlEncode(payload).split('').reverse().join('');
}

function decodePayload(value: string): string {
  return base64urlDecode(value.split('').reverse().join(''));
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private progress: ProgressState = this.getDefaultState();

  private getDefaultState(): ProgressState {
    return {
      version: 1,
      username: '',
      regions: ['kanto'],
      score: 0,
      certificate: false,
    };
  }

  load(): ProgressState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.progress = this.getDefaultState();
      return this.progress;
    }
    try {
      const parsed = JSON.parse(raw) as ProgressState;
      if (!Array.isArray(parsed.regions)) throw new Error('Invalid progress');
      this.progress = {
        version: parsed.version ?? 1,
        username: normalizeUsername(parsed.username ?? ''),
        regions: Array.from(new Set(parsed.regions.map(normalizeRegion))).filter(Boolean),
        score: Number(parsed.score ?? 0),
        certificate: !!parsed.certificate,
      };
      if (!this.progress.regions.length) this.progress.regions = ['kanto'];
      return this.progress;
    } catch {
      this.progress = this.getDefaultState();
      return this.progress;
    }
  }

  save(state?: Partial<ProgressState>): ProgressState {
    if (state) {
      this.progress = {
        ...this.progress,
        ...state,
        username: state.username !== undefined ? normalizeUsername(state.username) : this.progress.username,
        regions: state.regions ? Array.from(new Set(state.regions.map(normalizeRegion))).filter(Boolean) : this.progress.regions,
      };
    }
    this.progress.username = normalizeUsername(this.progress.username);
    this.progress.regions = Array.from(new Set(this.progress.regions.map(normalizeRegion))).filter(Boolean);
    if (!this.progress.regions.length) this.progress.regions = ['kanto'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    return this.progress;
  }

  reset(): ProgressState {
    this.progress = this.getDefaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    return this.progress;
  }

  getState(): ProgressState {
    return this.progress;
  }

  getCode(): string {
    const data = JSON.stringify({
      version: this.progress.version,
      username: this.progress.username,
      regions: this.progress.regions,
      score: this.progress.score,
      certificate: this.progress.certificate,
    });
    const checksum = stableHash(data + SECRET);
    return `${encodePayload(data)}.${checksum}`;
  }

  parseCode(code: string): ProgressState {
    const cleaned = String(code || '').trim();
    const parts = cleaned.split('.');
    if (parts.length !== 2) throw new Error('Invalid code format');
    const [payload, hash] = parts;
    if (!payload || !hash) throw new Error('Invalid code format');
    const data = decodePayload(payload);
    const expected = stableHash(data + SECRET);
    if (expected !== hash) throw new Error('Invalid or tampered code');
    const parsed = JSON.parse(data) as ProgressState;
    if (!Array.isArray(parsed.regions)) throw new Error('Invalid code content');
    this.progress = {
      version: parsed.version ?? 1,
      username: normalizeUsername(parsed.username ?? ''),
      regions: Array.from(new Set(parsed.regions.map(normalizeRegion))).filter(Boolean),
      score: Number(parsed.score ?? 0),
      certificate: !!parsed.certificate,
    };
    if (!this.progress.regions.length) this.progress.regions = ['kanto'];
    this.save();
    return this.progress;
  }

  addScore(points: number) {
    this.progress.score = Math.max(0, this.progress.score + Number(points || 0));
    this.save();
  }

  unlockRegion(region: string) {
    const normalized = normalizeRegion(region);
    if (!normalized) return;
    if (!this.progress.regions.includes(normalized)) {
      this.progress.regions.push(normalized);
      this.save();
    }
  }

  setCertificate(value: boolean) {
    this.progress.certificate = !!value;
    this.save();
  }

  setUsername(username: string) {
    this.progress.username = normalizeUsername(username);
    this.save();
    return this.progress;
  }

  getUsername(): string {
    return this.progress.username;
  }

  getUnlockedRegions(): string[] {
    return this.progress.regions;
  }
}
