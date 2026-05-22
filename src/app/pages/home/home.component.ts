import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { preloadAudiosOnce, preloadImagesOnce, playAudio } from '../../functions';
import { colorOptions, audiosPokedex, rotomGif } from '../../constants';
import { Router } from '@angular/router';
import { RulesComponent } from '../rules/rules.component';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RulesComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private audioUnlocked = false;
  private secretBuffer = "";
  private rotomTimeout?: number;
  private rotomCloseTimeout?: number;
  readonly rotomGif = rotomGif;

  options = [
    { name: "Quick", route: "/play" },
    { name: "Levels", route: "/competitive" }
  ];

  audioElements: HTMLAudioElement[] = [];
  hoveredColors: string[] = [];
  electricEffect: boolean = false;
  showRules: boolean = false;
  showRotomGif: boolean = false;
  rotomClosing: boolean = false;

  async ngOnInit() {
    this.hoveredColors = new Array(this.options.length).fill("");
    await preloadImagesOnce([rotomGif]);
    this.audioElements = await preloadAudiosOnce(audiosPokedex);
    this.audioElements.forEach(a => (a.volume = 0.5));
  }

  ngOnDestroy() {
    if (this.rotomTimeout) window.clearTimeout(this.rotomTimeout);
    if (this.rotomCloseTimeout) window.clearTimeout(this.rotomCloseTimeout);
    this.stopAllAudio();
  }

  private stopAllAudio() {
    this.audioElements.forEach(a => { try { a.pause(); a.currentTime = 0; } catch { } });
  }

  @HostListener('document:click')
  @HostListener('document:touchstart')
  unlockAudioOnce() {
    if (this.audioUnlocked || this.audioElements.length === 0) return;
    this.audioUnlocked = true;
    this.audioElements.forEach(a => {
      try {
        a.muted = true;
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        }).catch(() => { });
      } catch { }
    });
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (!/^\d$/.test(event.key)) return;

    this.secretBuffer = `${this.secretBuffer}${event.key}`.slice(-4);
    if (this.secretBuffer !== "0479") return;

    this.secretBuffer = "";
    this.showRotomGif = true;
    this.rotomClosing = false;
    this.rotomAnimation();
    if (this.rotomTimeout) window.clearTimeout(this.rotomTimeout);
    if (this.rotomCloseTimeout) window.clearTimeout(this.rotomCloseTimeout);
    this.rotomTimeout = window.setTimeout(() => this.closeRotomGif(), 3000);
  }

  setRandomColor(index: number) {
    const i = Math.floor(Math.random() * colorOptions.length);
    this.hoveredColors[index] = colorOptions[i];
  }

  goTo(route: string) { this.router.navigate([route]); }

  revealRules() { this.showRules = !this.showRules; }

  play(n: number) { playAudio(this.audioElements, n); }

  rotomAnimation() {
    this.play(2);
    this.electricEffect = true;
    setTimeout(() => { this.electricEffect = false; }, 2000);
  }

  closeRotomGif() {
    if (!this.showRotomGif || this.rotomClosing) return;

    this.rotomClosing = true;
    if (this.rotomTimeout) {
      window.clearTimeout(this.rotomTimeout);
      this.rotomTimeout = undefined;
    }
    this.rotomCloseTimeout = window.setTimeout(() => {
      this.showRotomGif = false;
      this.rotomClosing = false;
      this.rotomCloseTimeout = undefined;
    }, 120);
  }
}
