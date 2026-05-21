import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, inject, OnInit, QueryList, Renderer2, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PokeApiService } from '../../services/poke-api.service';
import { LoadingComponent } from '../loading/loading.component';
import { RulesComponent } from '../rules/rules.component';
import { PkmnTypeDirective } from '../../directives/pkmn-type.directive';
import { AttemptCell } from '../../interfaces/attempt-cell';
import { ValidPokemonResult } from '../../interfaces/valid-pokemon-result';
import * as constant from '../../constants';
import * as funct from '../../functions';

@Component({
  selector: 'app-free-wordle',
  imports: [CommonModule, FormsModule, LoadingComponent, RulesComponent, PkmnTypeDirective],
  templateUrl: './free-wordle.component.html',
  styleUrl: './free-wordle.component.css'
})
export class FreeWordleComponent implements OnInit, AfterViewInit {
  private pkService = inject(PokeApiService);
  private router = inject(Router);
  private renderer = inject(Renderer2);

  @ViewChildren("letterInput") letterInputs!: QueryList<ElementRef>;

  attempts: AttemptCell[][] = [];
  letterIndexes: number[] = [];
  attemptIndexes: number[] = [];

  loading: boolean = true;
  submitting: boolean = false;
  invalidPokemon: boolean = false;
  showHint: boolean = false;
  showRules: boolean = false;
  gameOver: boolean = false;
  gameWon: boolean = false;

  currentAttempt: number = 0;
  wordLength: number = 0;

  targetWordPkmn: string = "";
  pokemonType: string = "";

  async ngOnInit() {
    await funct.preloadImagesOnce(constant.imagesPlayAll);
    await this.pkService.startFreeOrRegionalGame();
    this.wordLength = this.pkService.wordLength;
    this.pokemonType = "";
    this.letterIndexes = Array.from({ length: this.wordLength }, (_, i) => i);
    this.attemptIndexes = Array.from({ length: constant.maxAttempts }, (_, i) => i);
    this.resetAttempts();
    this.loading = false;
  }

  ngAfterViewInit() {
    this.letterInputs.changes.subscribe(() => {
      if (this.letterInputs.length) this.focusInput(0, 0);
    });
  }

  @HostListener('window:keydown', ['$event'])
  async onWindowKeydown(event: KeyboardEvent) {
    if (event.repeat) return;

    if (event.key === 'Control' && !this.loading && !this.gameOver && !this.showHint) {
      event.preventDefault();
      await this.revealHint();
    }
  }

  private focusInput(row: number, col: number) {
    const inputs = this.letterInputs.toArray();
    const idx = row * this.wordLength + col;
    inputs[idx]?.nativeElement.focus();
  }

  async onLetterInput(event: Event, row: number, col: number) {
    if (row !== this.currentAttempt || this.gameOver) return;
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

    this.letterInputs.forEach(i => i.nativeElement.blur());
    const word = this.attempts[row].map(c => c.letter).join("").toLowerCase();

    this.submitting = true;
    try {
      const result: ValidPokemonResult = await this.pkService.guessPokemon(word);

      if (result.validName === false) {
        this.invalidPokemon = true;
        this.attempts[row].forEach(c => c.letter = "");
        this.clearRowInputs(row);
        this.focusInput(row, 0);
        return;
      }

      result.letterHints.forEach((hint, i) => {
        this.attempts[row][i].state = hint;
      });

      this.validateRow(row, result.letterHints);
      this.checkGameResult(result);
    } catch (e: any) {
      if (e?.status === 404) {
        this.pkService.resetGame();
        this.resetGame();
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

  private clearRowInputs(row: number) {
    const rowInputs = this.letterInputs.toArray().slice(row * this.wordLength, (row + 1) * this.wordLength);
    rowInputs.forEach((input) => {
      const el = input.nativeElement as HTMLInputElement;
      el.value = "";
    });
  }

  private async checkGameResult(result: ValidPokemonResult) {
    if (result.match) {
      this.gameWon = true;
      this.gameOver = true;
      return;
    }

    if ((result as any).ended) {
      this.gameOver = true;
      try {
        const revealRes = await this.pkService.guessPokemon("", true);
        this.targetWordPkmn = revealRes.decodedTarget || "";
      } catch { this.targetWordPkmn = ""; }
      return;
    }

    this.currentAttempt++;
    if (this.currentAttempt >= constant.maxAttempts) {
      this.gameOver = true;
      try {
        const revealRes = await this.pkService.guessPokemon("", true);
        this.targetWordPkmn = revealRes.decodedTarget || "";
      } catch {
        this.targetWordPkmn = "";
      }
    } else {
      this.focusInput(this.currentAttempt, 0);
    }
  }

  private resetAttempts() {
    this.currentAttempt = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.showHint = false;
    this.attempts = Array.from({ length: constant.maxAttempts }, () =>
      Array.from({ length: this.wordLength }, () => ({ letter: "", state: "" }))
    );
    setTimeout(() => {
      this.letterInputs.forEach(i => (i.nativeElement.value = ""));
      this.letterInputs.first?.nativeElement.focus();
    });
  }

  async resetGame() {
    this.loading = true;

    this.pkService.resetGame();
    await this.pkService.startFreeOrRegionalGame();

    this.wordLength = this.pkService.wordLength;
    this.pokemonType = "";
    this.letterIndexes = Array.from({ length: this.wordLength }, (_, i) => i);

    this.currentAttempt = 0;
    this.gameOver = false;
    this.gameWon = false;
    this.showHint = false;
    this.invalidPokemon = false;

    this.attempts = Array.from({ length: constant.maxAttempts }, () =>
      Array.from({ length: this.wordLength }, () => ({ letter: "", state: "" }))
    );

    setTimeout(() => {
      this.letterInputs.forEach(i => {
        const el = i.nativeElement as HTMLInputElement;
        el.value = "";
        el.classList.remove("flip", "correct", "present", "absent");
      });
      this.focusInput(0, 0);
    });

    this.showRules = false;
    this.loading = false;
  }

  revealRules() { this.showRules = !this.showRules; }

  async revealHint() {
    if (this.showHint) return;
    try {
      const hint = await this.pkService.getHint();
      this.pokemonType = hint ?? "";
      this.showHint = true;
    } catch (e) {
      console.error(e);
    }
  }

  goToHome() { this.router.navigateByUrl("/home"); }
}
