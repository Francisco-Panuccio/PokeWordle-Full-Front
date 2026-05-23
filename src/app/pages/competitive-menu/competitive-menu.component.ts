import { Component, OnDestroy, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';
import { Router } from '@angular/router';
import { CertificateDirective } from '../../directives/certificate.directive';
import { BackgroundRegionsDirective } from '../../directives/background-regions.directive';
import { RulesComponent } from '../rules/rules.component';
import { TitleCasePipe } from '@angular/common';
import { PreloadService } from '../../services/preload.service';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-competitive-menu',
  imports: [CommonModule, FormsModule, LoadingComponent, RulesComponent, CertificateDirective, BackgroundRegionsDirective, TitleCasePipe],
  templateUrl: './competitive-menu.component.html',
  styleUrl: './competitive-menu.component.css'
})
export class CompetitiveMenuComponent implements OnDestroy {
  private progress = inject(ProgressService);
  private router = inject(Router);
  private preload = inject(PreloadService);
  private renderer = inject(Renderer2);

  regions: string[] = [];
  loading: boolean = true;
  certificate: boolean = false;
  showRules: boolean = false;
  score: number = 0;
  username: string = "";
  usernameInput: string = "";
  inputCode: string = "";
  currentCode: string = "";
  statusMessage: string = "";
  showLoadCode: boolean = false;
  showResetConfirm: boolean = false;

  async ngOnInit() {
    this.renderer.addClass(document.body, 'top-aligned-page');
    this.refreshState();
    this.loading = false;
    void this.preloadRegionsIfReady();
  }

  ngOnDestroy() {
    this.renderer.removeClass(document.body, 'top-aligned-page');
  }

  private async preloadRegionsIfReady() {
    if (!this.username) return;
    await this.preload.preloadCompetitive(this.regions);
    if (this.regions.includes('tournament')) {
      this.preload.preloadTournament();
    }
  }

  refreshState() {
    const state = this.progress.load();
    this.username = state.username;
    this.usernameInput = state.username;
    this.regions = state.regions;
    this.score = state.score ?? 0;
    this.certificate = !!state.certificate;
    this.currentCode = this.progress.getCode();
  }

  async saveUsername() {
    this.statusMessage = '';
    const cleaned = String(this.usernameInput || '').trim();
    const isValid = /^[A-Za-z0-9ñÑ]{3,12}$/.test(cleaned);
    if (!cleaned) {
      this.statusMessage = 'Enter a username to continue.';
      return;
    }
    if (!isValid) {
      this.statusMessage = 'Username must be 3-12 chars, letters/numbers only, ñ allowed.';
      return;
    }
    this.progress.setUsername(cleaned);
    this.refreshState();
    await this.preloadRegionsIfReady();
    this.statusMessage = 'Username saved. Your progress is now protected by code.';
  }

  copyCode() {
    if (!this.currentCode) return;
    navigator.clipboard.writeText(this.currentCode).catch(() => { });
    this.statusMessage = 'Code copied to clipboard';
    setTimeout(() => { this.statusMessage = ''; }, 2000);
  }

  async loadCode() {
    this.statusMessage = '';
    if (!this.inputCode.trim()) {
      this.statusMessage = 'Enter a progress code before loading.';
      return;
    }
    try {
      this.progress.parseCode(this.inputCode);
      this.inputCode = '';
      this.refreshState();
      await this.preloadRegionsIfReady();
      this.showLoadCode = false;
      this.statusMessage = 'Progress restored successfully.';
    } catch (error: any) {
      this.statusMessage = 'Invalid code. Please check and try again.';
    }
  }

  toggleLoadCode() {
    this.showLoadCode = !this.showLoadCode;
  }

  resetProgress() {
    this.showResetConfirm = true;
  }

  confirmResetProgress() {
    this.progress.reset();
    this.inputCode = '';
    this.statusMessage = 'Progress reset.';
    this.showLoadCode = false;
    this.showResetConfirm = false;
    this.refreshState();
  }

  cancelResetProgress() {
    this.showResetConfirm = false;
  }

  goToRegionalWordle(region: string) {
    const r = (region ?? '').trim().toLowerCase();
    if (!r) return;

    if (r === 'tournament') {
      this.router.navigateByUrl('/tournament');
      return;
    }

    this.router.navigateByUrl(`/progress/region/${r}`);
  }

  revealRules() { this.showRules = !this.showRules; }

  goBack() { this.router.navigateByUrl('/home'); }
}

