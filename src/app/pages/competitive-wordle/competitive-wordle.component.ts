import { AfterViewInit, Component, ElementRef, HostListener, inject, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren } from '@angular/core';
import { AttemptCell } from '../../interfaces/attempt-cell';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PokeApiService } from '../../services/poke-api.service';
import { RulesComponent } from '../rules/rules.component';
import { LoadingComponent } from '../loading/loading.component';
import { PkmnTypeDirective } from '../../directives/pkmn-type.directive';
import { ValidPokemonResult } from '../../interfaces/valid-pokemon-result';
import * as constant from '../../constants';
import * as funct from '../../functions';

@Component({
  standalone: true,
  selector: 'app-competitive-wordle',
  imports: [FormsModule, CommonModule, RulesComponent, LoadingComponent, PkmnTypeDirective, TitleCasePipe],
  templateUrl: './competitive-wordle.component.html',
  styleUrl: './competitive-wordle.component.css'
})
export class CompetitiveWordleComponent implements OnInit, AfterViewInit, OnDestroy {
  private pkService = inject(PokeApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private renderer = inject(Renderer2);
  private sub?: any;
  private finishInfo: { regionCompleted: boolean; nextRegion?: string } | null = null;
  private roundFinished = false;

  @ViewChildren("letterInput") letterInputs!: QueryList<ElementRef>;

  attempts: AttemptCell[][] = [];
  letterIndexes: number[] = [];
  audioElements: HTMLAudioElement[] = [];
  attemptIndexes = Array.from({ length: constant.maxAttempts }, (_, i) => i);

  loading: boolean = true;
  submitting: boolean = false;
  invalidPokemon: boolean = false;
  showHint: boolean = false;
  showRules: boolean = false;
  showGameOver: boolean = false;
  gameOver: boolean = false;
  gameWon: boolean = false;
  usedHint: boolean = false;

  readonly targetGyms = 8;
  currentAttempt: number = 0;
  wordLength: number = 0;
  gymsPassed: number = 0;

  region: string = "";
  defeatImage: string = "";
  targetWordPkmn: string = "";
  pokemonType: string = "";

  async ngOnInit() {
    this.region = (this.route.snapshot.paramMap.get("region") || "").trim().toLowerCase();
    await this.startRegionalRound();
    this.loading = false;
  }

  ngAfterViewInit() {
    this.sub = this.letterInputs.changes.subscribe(() => {
      if (this.letterInputs.length) this.focusInput(0, 0);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  async onWindowKeydown(event: KeyboardEvent) {
    if (event.repeat) return;

    if (event.key === 'Enter' && this.showGameOver && this.gameWon) {
      event.preventDefault();
      await this.nextRound();
      return;
    }

    if (event.key === 'Control' && !this.loading && !this.showGameOver && !this.gameOver && !this.showHint) {
      event.preventDefault();
      await this.revealHint();
    }
  }

  private async startRegionalRound(): Promise<void> {
    this.clearRoundFlags();
    await this.pkService.startFreeOrRegionalGame(this.region);
    this.wordLength = this.pkService.wordLength;
    this.letterIndexes = Array.from({ length: this.wordLength }, (_, i) => i);
    this.resetAttempts(true);
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
    const val = input.value.toUpperCase();
    if (!funct.isValidLetter(val, 1)) {
      this.attempts[row][col].letter = "";
      input.value = "";
      return;
    }
    this.attempts[row][col].letter = val;

    if (col < this.wordLength - 1) {
      this.focusInput(row, col + 1);
      return;
    }
    if (!this.attempts[row].every(c => c.letter)) return;

    this.submitting = true;
    try {
      const word = this.attempts[row].map(c => c.letter).join("").toLowerCase();
      const result: ValidPokemonResult = await this.pkService.guessPokemon(word);

      if (result.validName === false) {
        this.invalidPokemon = true;
        this.focusInput(row, this.wordLength - 1);
        return;
      }

      result.letterHints.forEach((hint, i) => { this.attempts[row][i].state = hint; });
      this.validateRow(row, result.letterHints);
      await this.handleResult(result);
    } catch (e: any) {
      if (e?.status === 404) {
        this.pkService.resetGame();
        await this.startRegionalRound();
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

  private async handleResult(result: ValidPokemonResult) {
    if (result.match) {
        this.gameWon = true;
        await this.finishRound(true);
      this.showGameOver = true;
      return;
    }

    if ((result as any).ended) {
      this.onDefeat();
      return;
    }

    this.currentAttempt++;
    if (this.currentAttempt >= constant.maxAttempts) {
      this.onDefeat();
    } else {
      this.focusInput(this.currentAttempt, 0);
    }
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

  private async onDefeat() {
    await this.revealTarget();
    await this.finishRound(false);
    this.gameOver = true;
    this.showGameOver = true;

    const idx = Math.floor(Math.random() * (constant.imagesRegional.length - 1)) + 1;
    this.defeatImage = constant.imagesRegional[idx];
  }

  private async revealTarget() {
    try {
      const revealRes = await this.pkService.guessPokemon("", true);
      this.targetWordPkmn = revealRes.decodedTarget || "";
    } catch {
      this.targetWordPkmn = "";
    }
  }

  private clearRoundFlags() {
    this.invalidPokemon = false;
    this.showHint = false;
    this.gameOver = false;
    this.gameWon = false;
    this.usedHint = false;
    this.currentAttempt = 0;
    this.pokemonType = "";
    this.roundFinished = false;
    this.finishInfo = null;
  }

  private resetAttempts(clearStyles = true) {
    this.currentAttempt = 0;
    this.attempts = Array.from({ length: constant.maxAttempts }, () =>
      Array.from({ length: this.wordLength }, () => ({ letter: "", state: "" }))
    );
    setTimeout(() => {
      this.letterInputs.forEach(i => {
        const el = i.nativeElement as HTMLInputElement;
        el.value = "";
        if (clearStyles) el.classList.remove("flip", "correct", "present", "absent");
      });
      this.letterInputs.first?.nativeElement.focus();
    });
  }

  private async finishRound(won: boolean): Promise<void> {
    if (this.roundFinished) return;
    this.roundFinished = true;
    try {
      this.finishInfo = await this.pkService.finishGame(won, this.gymsPassed, this.currentAttempt, this.usedHint);
    } catch (e: any) {
      console.error("Finish Game Failed", e);
    }
  }

  async nextRound() {
    if (!this.roundFinished) return;
    const info = this.finishInfo;
    this.finishInfo = null;
    this.roundFinished = false;
    this.showGameOver = false;

    if (info?.regionCompleted) {
      await this.router.navigateByUrl("/progress");
      return;
    }

    this.resetAttempts();
    this.gymsPassed = this.gameWon ? this.gymsPassed + 1 : 0;
    this.gameWon = false;
    await this.startRegionalRound();
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

  goToMenu() { this.router.navigateByUrl("/competitive"); }
}
