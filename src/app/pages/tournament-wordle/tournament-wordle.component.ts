import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PokeApiService } from '../../services/poke-api.service';
import { LoadingComponent } from '../loading/loading.component';
import { PkmnTypeDirective } from '../../directives/pkmn-type.directive';
import { AttemptCell } from '../../interfaces/attempt-cell';
import { ValidPokemonResult } from '../../interfaces/valid-pokemon-result';
import { ProgressService } from '../../services/progress.service';
import * as constant from '../../constants';
import * as funct from '../../functions';

@Component({
  standalone: true,
  selector: 'app-tournament-wordle',
  imports: [CommonModule, FormsModule, PkmnTypeDirective, LoadingComponent],
  templateUrl: './tournament-wordle.component.html',
  styleUrl: './tournament-wordle.component.css'
})
export class TournamentWordleComponent
  implements OnInit, AfterViewInit, OnDestroy {
  private pkService = inject(PokeApiService);
  private progress = inject(ProgressService);
  private router = inject(Router);
  private renderer = inject(Renderer2);

  private bgAudio?: HTMLAudioElement;
  private timerInterval?: number;
  private sub?: any;
  private roundFinished = false;
  private audioUnlocked = false;

  @ViewChildren("letterInput") letterInputs!: QueryList<ElementRef>;

  attempts: AttemptCell[][] = [];
  letterIndexes: number[] = [];
  attemptIndexes = Array.from({ length: constant.maxAttempts }, (_, i) => i);
  championsOrder = [...constant.championsOrder];

  loading: boolean = true;
  submitting: boolean = false;
  showTransition: boolean = true;
  showWordle: boolean = false;
  invalidPokemon: boolean = false;
  showHint: boolean = false;
  showRules: boolean = false;
  showGameOver: boolean = false;
  gameWon: boolean = false;
  gameOver: boolean = false;
  usedHint: boolean = false;

  currentAttempt: number = 0;
  currentChampionIndex: number = 0;
  wordLength: number = 0;
  timer = constant.timer;

  currentChampionName: string = this.championsOrder[0];
  defeatImage: string = "";
  pokemonType: string = "";

  async ngOnInit() {
    this.initBgAudio();
    await this.startChampionRound(this.currentChampionName);
    this.loading = false;
    this.showTransition = true;
    this.startAfterTransition();
  }

  ngAfterViewInit() {
    this.sub = this.letterInputs.changes.subscribe(() => {
      if (this.letterInputs.length) this.focusInput(0, 0);
    });
  }

  ngOnDestroy() {
    this.stopTimer();
    this.sub?.unsubscribe();
    if (this.bgAudio) {
      try { this.bgAudio.pause(); this.bgAudio.currentTime = 0; } catch { }
      this.bgAudio = undefined;
    }
  }

  private async initBgAudio() {
    const [bg] = await funct.preloadAudiosOnce(constant.tournamentBackground);
    if (!bg) return;
    this.bgAudio = bg;
    this.bgAudio.loop = true;
    this.bgAudio.volume = 0.35;

    try {
      await this.bgAudio.play();
    } catch {
      try {
        this.bgAudio.muted = true;
        await this.bgAudio.play();
        setTimeout(async () => {
          if (!this.bgAudio) return;
          try { this.bgAudio.muted = false; await this.bgAudio.play(); } catch { }
        }, 2000);
      } catch { }
    }
  }

  @HostListener('document:click')
  @HostListener('document:touchstart')
  unlockBgAudio() {
    if (this.audioUnlocked || !this.bgAudio) return;
    this.audioUnlocked = true;
    try {
      this.bgAudio.muted = false;
      if (this.bgAudio.paused) this.bgAudio.play().catch(() => { });
    } catch { }
  }

  @HostListener('window:keydown', ['$event'])
  async onWindowKeydown(event: KeyboardEvent) {
    if (event.repeat) return;

    if (event.key === 'Control' && !this.loading && !this.showRules && this.showWordle && !this.showTransition && !this.gameOver && !this.showHint) {
      event.preventDefault();
      await this.revealHint();
    }
  }

  private async startChampionRound(name: string) {
    this.clearFlags();
    await this.pkService.startChampionGame(name);
    this.wordLength = this.pkService.wordLength;
    this.letterIndexes = Array.from({ length: this.wordLength }, (_, i) => i);
    this.resetAttempts();
  }

  private async startAfterTransition() {
    await new Promise(r => setTimeout(r, 2500));
    this.showWordle = true;
    this.showTransition = false;
    this.startTimer();
  }

  private focusInput(row: number, col: number) {
    const inputs = this.letterInputs.toArray();
    const idx = row * this.wordLength + col;
    inputs[idx]?.nativeElement.focus();
  }

  async onLetterInput(event: Event, row: number, col: number) {
    if (row !== this.currentAttempt || this.gameOver || this.submitting) return;
    this.invalidPokemon = false;

    const input = event.target as HTMLInputElement;
    const v = input.value.toUpperCase();
    if (!funct.isValidLetter(v, 1)) {
      this.attempts[row][col].letter = "";
      input.value = "";
      return;
    }
    this.attempts[row][col].letter = v;

    if (col < this.wordLength - 1) {
      this.focusInput(row, col + 1);
      return;
    }
    if (!this.attempts[row].every(c => c.letter)) return;

    this.submitting = true;
    try {
      const guess = this.attempts[row].map(c => c.letter).join("").toLowerCase();
      const result: ValidPokemonResult = await this.pkService.guessPokemon(guess);

      if (result.validName === false) {
        this.invalidPokemon = true;
        this.focusInput(row, this.wordLength - 1);
        return;
      }

      result.letterHints.forEach((h, i) => { this.attempts[row][i].state = h; });
      this.validateRow(row, result.letterHints);
      await this.handleResult(result);
    } catch (e: any) {
      if (e?.status === 404) {
        this.pkService.resetGame();
        await this.pkService.startChampionGame(this.currentChampionName);
        this.showWordle = true;
        this.showTransition = false;
        this.startTimer();
      } else {
        console.error("Error Validating Pokemon: ", e);
      }
    } finally {
      this.submitting = false;
    }
  }

  onLetterKeydown(event: KeyboardEvent, row: number, col: number) {
    if (row !== this.currentAttempt || this.gameOver) {
      event.preventDefault();
      return;
    }

    const allowed = ["Backspace", "ArrowLeft", "ArrowRight", "Tab"];

    if (!allowed.includes(event.key) && !funct.isValidLetter(event.key, 2)) {
      event.preventDefault();
      return;
    }

    const rowInputs = this.letterInputs.toArray().slice(row * this.wordLength, (row + 1) * this.wordLength);

    if (event.key === "Backspace") {
      if (this.attempts[row][col].letter) {
        this.attempts[row][col].letter = "";
      } else if (col > 0) {
        this.attempts[row][col - 1].letter = "";
        rowInputs[col - 1].nativeElement.focus();
      }
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft" && col > 0) rowInputs[col - 1].nativeElement.focus();
    if (event.key === "ArrowRight" && col < rowInputs.length - 1) rowInputs[col + 1].nativeElement.focus();
  }

  private validateRow(row: number, hints: string[]) {
    const slice = this.letterInputs.toArray().slice(row * this.wordLength, (row + 1) * this.wordLength);
    slice.forEach((el, i) => {
      setTimeout(() => {
        this.renderer.addClass(el.nativeElement, "flip");
        this.renderer.addClass(el.nativeElement, hints[i]);
      }, i * 100);
    });
  }

  private async handleResult(res: ValidPokemonResult) {
    if (res.match) { await this.onWinWordle(); return; }

    if ((res as any).ended || this.timer <= 0) {
      await this.onLoseWordle();
      return;
    }

    this.currentAttempt++;
    if (this.currentAttempt >= constant.maxAttempts) await this.onLoseWordle();
    else this.focusInput(this.currentAttempt, 0);
  }

  private async onWinWordle() {
    if (this.gameOver) return;
    this.stopTimer();
    await this.finishRound();

    this.currentChampionIndex++;
    const finished = this.currentChampionIndex >= this.championsOrder.length;

    if (finished) {
      this.progress.setCertificate(true);
      this.gameWon = true;
      this.gameOver = true;
      this.showGameOver = true;
      return;
    }

    this.currentChampionName = this.championsOrder[this.currentChampionIndex];
    this.showTransition = true;
    this.showWordle = false;
    await this.startChampionRound(this.currentChampionName);
    await this.startAfterTransition();
  }

  private async onLoseWordle() {
    if (this.gameOver) return;
    this.stopTimer();
    this.gameOver = true;
    this.showGameOver = true;
    const idx = Math.floor(Math.random() * (constant.imagesRegional.length - 1)) + 1;
    this.defeatImage = constant.imagesRegional[idx];
    await this.finishRound();
  }

  private clearFlags() {
    this.invalidPokemon = false;
    this.showHint = false;
    this.gameOver = false;
    this.gameWon = false;
    this.usedHint = false;
    this.roundFinished = false;
    this.currentAttempt = 0;
    this.pokemonType = "";
  }

  private resetAttempts() {
    this.currentAttempt = 0;
    this.attempts = Array.from({ length: constant.maxAttempts }, () =>
      Array.from({ length: this.wordLength }, () => ({ letter: "", state: "" }))
    );
    setTimeout(() => {
      this.letterInputs?.forEach(i => {
        const el = i.nativeElement as HTMLInputElement;
        el.value = "";
        el.classList.remove("flip", "correct", "present", "absent");
      });
      this.focusInput(0, 0);
    });
  }

  private startTimer() {
    this.stopTimer();
    this.timer = constant.timer;
    this.timerInterval = window.setInterval(() => {
      this.timer--;
      if (this.timer <= 0) this.onLoseWordle();
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval != null) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private async finishRound(): Promise<void> {
    if (this.roundFinished) return;
    this.roundFinished = true;
    try {
      await this.pkService.finishGame(this.gameWon, 0);
    } catch (e: any) {
      if (e?.status === 409) return;
      console.error("Finish Game Failed", e);
    }
  }

  async revealHint() {
    if (this.showHint) return;
    try {
      const hint = await this.pkService.getHint();
      this.pokemonType = hint ?? "";
      this.showHint = true;
      this.usedHint = true;
    } catch (e) {
      console.error(e);
    }
  }

  revealRules() { this.showRules = !this.showRules; }

  goBack() {
    if (this.bgAudio) { try { this.bgAudio.pause(); this.bgAudio.currentTime = 0; } catch { } }
    this.router.navigateByUrl("/competitive");
  }
}
