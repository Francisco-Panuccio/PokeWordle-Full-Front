import { inject, Injectable } from '@angular/core';
import { ValidPokemonResult } from '../interfaces/valid-pokemon-result';
import { ProgressService } from './progress.service';
import { regionsOrder } from '../constants';
import { encodedPokemonData, EncodedPokemonEntry } from '../data/encoded-pokemon';

const DATA_SECRET = String.fromCharCode(
  112, 48, 107, 51, 119, 48, 114, 100, 108, 51,
  95, 100, 97, 116, 97, 95, 108, 97, 121, 101,
  114, 95, 118, 51
);
const GAME_SECRET = String.fromCharCode(
  112, 48, 107, 51, 119, 48, 114, 100, 108, 51,
  95, 104, 105, 100, 100, 101, 110, 95, 118, 101,
  99, 116, 111, 114, 95, 118, 50
);

function normalize(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function xorEncode(value: string, key: string): number[] {
  const output: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    output.push(value.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return output;
}

function xorDecode(value: number[], key: string): string {
  return String.fromCharCode(...value.map((code, index) => code ^ key.charCodeAt(index % key.length)));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeSeed(value: string): number {
  let hash = hashString(value);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

interface LocalGameState {
  target: number[];
  targetMask: number;
  region?: string;
  champion?: string;
  wordLength: number;
  expiresAt: number;
  hintType: string | null;
  lastRoundWon: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class PokeApiService {
  private progress = inject(ProgressService);
  private game: LocalGameState | null = null;
  private devtoolsOpen = false;
  private devtoolsListenInterval: number | null = null;
  private readonly pokemonNames = new Set<number>(encodedPokemonData.map(entry => entry.nameHash));
  private readonly pokemonMap = new Map<number, EncodedPokemonEntry>(encodedPokemonData.map(entry => [entry.nameHash, entry]));

  wordLength: number = 0;
  expiresAt: number | null = null;
  hintType: string | null = null;

  constructor() {
    this.watchDevTools();
  }

  resetGame() {
    this.game = null;
    this.wordLength = 0;
    this.expiresAt = null;
    this.hintType = null;
  }

  private activeRegion?: string;
  private activeRegionTargetHashes = new Set<number>();

  private normalize(value: string | undefined): string {
    return normalize(value);
  }

  private chooseSeeded<T>(items: T[], seed: number): T {
    const random = seededRandom(seed);
    return items[Math.floor(random() * items.length)];
  }

  private xorTransform(value: number[], key: number): number[] {
    return value.map((code, index) => code ^ ((key + index) & 0xff));
  }

  private decodeDataName(value: number[]): string {
    return xorDecode(value, DATA_SECRET);
  }

  private makeGameSeed(region?: string, champion?: string): number {
    const user = normalize(this.progress.getUsername());
    const regionMarker = region ? this.normalize(region) : '';
    const championMarker = champion ? this.normalize(champion) : '';
    const roundIndex = this.activeRegionTargetHashes.size;
    const parts = [user, regionMarker, championMarker, String(roundIndex), GAME_SECRET].join('|');
    return makeSeed(parts);
  }

  private makeTargetMask(region?: string, champion?: string, seedOverride?: number): number {
    const seed = seedOverride ?? this.makeGameSeed(region, champion);
    return (seed ^ 0xa7c13f2d) & 0xff;
  }

  private getRegionPokemon(region?: string) {
    const normalized = this.normalize(region);
    return normalized
      ? encodedPokemonData.filter((entry) => entry.regionHash === hashString(normalized))
      : encodedPokemonData;
  }

  private getChampionPokemon(champion: string) {
    const normalizedHash = hashString(this.normalize(champion));
    const items = encodedPokemonData.filter((entry) => entry.championHashes.includes(normalizedHash));
    return items.map((entry) => entry.encodedName);
  }

  async startFreeOrRegionalGame(region?: string): Promise<void> {
    const regionEntries = this.getRegionPokemon(region);
    if (!regionEntries.length) throw new Error('Invalid region');

    if (region) {
      const normalized = this.normalize(region);
      if (this.activeRegion !== normalized) {
        this.activeRegion = normalized;
        this.activeRegionTargetHashes.clear();
      }
    } else {
      this.activeRegion = undefined;
      this.activeRegionTargetHashes.clear();
    }

    const availableEntries = regionEntries.filter((entry) => !this.activeRegionTargetHashes.has(entry.nameHash));
    const targetEntries = availableEntries.length ? availableEntries : regionEntries;
    const seed = region
      ? this.makeGameSeed(region)
      : makeSeed(`${Date.now()}|${Math.random()}|${GAME_SECRET}`);
    const selectedEntry = this.chooseSeeded(targetEntries, seed);
    if (region) {
      this.activeRegionTargetHashes.add(selectedEntry.nameHash);
    }

    const targetMask = this.makeTargetMask(region, undefined, seed);
    const maskedTarget = this.xorTransform(selectedEntry.encodedName, targetMask);
    const decodedTarget = this.decodeDataName(this.xorTransform(maskedTarget, targetMask));
    this.game = {
      target: maskedTarget,
      targetMask,
      region: this.normalize(region),
      champion: undefined,
      wordLength: decodedTarget.length,
      expiresAt: Date.now() + 1000 * 60 * 60,
      hintType: null,
      lastRoundWon: null,
    };
    this.wordLength = this.game.wordLength;
    this.expiresAt = this.game.expiresAt;
    this.hintType = null;
  }

  async startChampionGame(champion: string): Promise<void> {
    this.activeRegion = undefined;
    this.activeRegionTargetHashes.clear();

    const targetList = this.getChampionPokemon(champion);
    if (!targetList.length) throw new Error('Invalid champion');
    const selected = this.chooseSeeded(targetList, this.makeGameSeed(undefined, champion));
    const targetMask = this.makeTargetMask(undefined, champion);
    const maskedTarget = this.xorTransform(selected, targetMask);
    const decodedTarget = this.decodeDataName(this.xorTransform(maskedTarget, targetMask));
    this.game = {
      target: maskedTarget,
      targetMask,
      region: undefined,
      champion: this.normalize(champion),
      wordLength: decodedTarget.length,
      expiresAt: Date.now() + 1000 * 60 * 60,
      hintType: null,
      lastRoundWon: null,
    };
    this.wordLength = this.game.wordLength;
    this.expiresAt = this.game.expiresAt;
    this.hintType = null;
  }

  private isValidPokemon(name: string): boolean {
    const normalized = this.normalize(name);
    return this.pokemonNames.has(hashString(normalized));
  }

  private getDecodedTarget(): string {
    if (!this.game) throw new Error('Game not Initialized');
    return this.decodeDataName(this.xorTransform(this.game.target, this.game.targetMask));
  }

  private async waitIfDevtoolsOpen(): Promise<void> {
    if (!this.devtoolsOpen) return;
    const delay = 30 + Math.floor(Math.random() * 90);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private watchDevTools(): void {
    if (typeof window === 'undefined') return;
    const threshold = 160;
    const check = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      const open = widthDiff || heightDiff;
      if (open !== this.devtoolsOpen) {
        this.devtoolsOpen = open;
        if (open) {
          console.warn('DevTools detected — defensive mode enabled.');
        }
      }
    };
    check();
    window.addEventListener('resize', check);
    this.devtoolsListenInterval = window.setInterval(check, 1000);
  }

  private maybeSpoofIfDevtools(result: ValidPokemonResult): ValidPokemonResult {
    if (!this.devtoolsOpen) return result;
    if (Math.random() < 0.18) {
      return { letterHints: [], match: false, validName: false, error: 'Invalid pokemon name' };
    }
    return result;
  }

  async guessPokemon(guess: string, reveal = false): Promise<ValidPokemonResult> {
    if (!this.game) throw new Error('Game not Initialized');

    const word = this.normalize(guess);
    if (reveal) {
      return {
        letterHints: [],
        match: false,
        decodedTarget: this.getDecodedTarget(),
        validName: true,
      };
    }

    if (!word || word.length !== this.game.wordLength) {
      this.game.lastRoundWon = false;
      return this.maybeSpoofIfDevtools({ letterHints: [], match: false, validName: false, error: 'Invalid pokemon name' });
    }

    if (!this.isValidPokemon(word)) {
      this.game.lastRoundWon = false;
      return this.maybeSpoofIfDevtools({ letterHints: [], match: false, validName: false, error: 'Invalid pokemon name' });
    }

    await this.waitIfDevtoolsOpen();
    const letters = word.split('');
    const decodedTarget = this.getDecodedTarget();
    const targetLetters = decodedTarget.split('');
    const hints: ('correct' | 'present' | 'absent')[] = Array.from({ length: this.game.wordLength }, () => 'absent');
    const unmatchedTarget: string[] = [];

    targetLetters.forEach((letter, index) => {
      if (letters[index] === letter) {
        hints[index] = 'correct';
      } else {
        unmatchedTarget.push(letter);
      }
    });

    letters.forEach((letter, index) => {
      if (hints[index] === 'correct') return;
      const foundIndex = unmatchedTarget.indexOf(letter);
      if (foundIndex >= 0) {
        hints[index] = 'present';
        unmatchedTarget.splice(foundIndex, 1);
      }
    });

    const match = word === decodedTarget;
    this.game.lastRoundWon = match;
    return {
      letterHints: hints,
      match,
      validName: true,
    };
  }

  async getHint(): Promise<string | null> {
    if (!this.game) return null;
    const decodedTarget = this.getDecodedTarget();
    const targetHash = hashString(decodedTarget);
    const pokemon = this.pokemonMap.get(targetHash);
    return pokemon?.type ?? null;
  }

  private calculateGymScore(failedAttempts: number, usedHint: boolean): number {
    const basePoints = 100;
    const attemptPenalty = Math.max(0, failedAttempts) * 10;
    const hintPenalty = usedHint ? 30 : 0;
    return Math.max(0, basePoints - attemptPenalty - hintPenalty);
  }

  async finishGame(won: boolean, gymsPassed: number, attemptsUsed: number = 0, usedHint: boolean = false, pendingRegionScore: number = 0): Promise<{ regionCompleted: boolean; nextRegion?: string; roundScore: number }> {
    if (!this.game) throw new Error('Game not Initialized');
    this.game.lastRoundWon = won;
    const roundScore = won && this.game.region ? this.calculateGymScore(attemptsUsed, usedHint) : 0;

    if (!this.game.region) {
      return { regionCompleted: false, roundScore };
    }

    const currentRegion = this.game.region;
    const requiredWins = 8;
    const willComplete = won && gymsPassed + 1 >= requiredWins;
    const nextRegion = willComplete ? this.getNextRegion(currentRegion) : undefined;

    if (willComplete) {
      this.progress.addScore(pendingRegionScore + roundScore);
    }

    if (willComplete && nextRegion) {
      this.progress.unlockRegion(nextRegion);
    }

    return { regionCompleted: willComplete, nextRegion, roundScore };
  }

  private getNextRegion(current: string): string | undefined {
    const index = regionsOrder.indexOf(this.normalize(current));
    if (index < 0 || index >= regionsOrder.length - 1) return undefined;
    return regionsOrder[index + 1];
  }
}
