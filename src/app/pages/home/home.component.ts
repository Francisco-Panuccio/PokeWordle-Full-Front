import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { preloadAudiosOnce, playAudio } from '../../functions';
import { colorOptions, audiosPokedex } from '../../constants';
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

  options = [
    { name: "Quick", route: "/play" },
    { name: "Levels", route: "/competitive" }
  ];

  audioElements: HTMLAudioElement[] = [];
  hoveredColors: string[] = [];
  electricEffect: boolean = false;
  showRules: boolean = false;

  async ngOnInit() {
    this.hoveredColors = new Array(this.options.length).fill("");
    this.audioElements = await preloadAudiosOnce(audiosPokedex);
    this.audioElements.forEach(a => (a.volume = 0.5));
  }

  ngOnDestroy() {
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
}
