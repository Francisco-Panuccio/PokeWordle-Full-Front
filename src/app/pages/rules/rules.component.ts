import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { brokenGlassAudio, unownSecretAudio, unownSecretImages } from '../../constants';
import { preloadAudiosOnce, preloadImagesOnce } from '../../functions';

@Component({
  selector: 'app-rules',
  imports: [],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.css'
})
export class RulesComponent implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  private secretBuffer = "";
  private brokenGlass?: HTMLAudioElement;
  private unownCrying?: HTMLAudioElement;
  private staticAudio?: HTMLAudioElement;
  private unownTimeout?: number;

  crackedImage = "images/cracked.png";
  unownMessage = ["we", "watch", "you"];
  secretActive = false;
  showUnownMessage = false;
  staticFlickerActive = false;

  async ngOnInit() {
    await preloadImagesOnce(unownSecretImages);
    const [broken] = await preloadAudiosOnce(brokenGlassAudio);
    const [unownCrying, staticAudio] = await preloadAudiosOnce(unownSecretAudio);
    this.brokenGlass = broken;
    this.unownCrying = unownCrying;
    this.staticAudio = staticAudio;
  }

  ngOnDestroy() {
    if (this.unownTimeout) window.clearTimeout(this.unownTimeout);
    this.stopSecretAudio();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (this.secretActive) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (event.key === "Escape") {
      this.close();
      return;
    }

    if (!/^\d$/.test(event.key)) return;

    this.secretBuffer = `${this.secretBuffer}${event.key}`.slice(-4);
    if (this.secretBuffer === "0201") {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.activateSecret();
    }
  }

  close() {
    if (this.secretActive) return;
    this.closed.emit();
  }

  private activateSecret() {
    this.secretActive = true;
    this.secretBuffer = "";
    this.playBrokenGlass();
    this.unownTimeout = window.setTimeout(() => {
      this.showUnownMessage = true;
      this.playUnownSequence();
    }, 5000);
  }

  private playBrokenGlass() {
    const audio = this.brokenGlass ?? new Audio("sounds/broken_glass.mp3");
    this.brokenGlass = audio;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.8;
      audio.onended = () => this.playStaticOnce();
      audio.play().catch(() => { });
    } catch { }
  }

  private playStaticOnce() {
    const audio = this.staticAudio ?? new Audio("sounds/static_unown.mp3");
    this.staticAudio = audio;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.8;
      audio.loop = false;
      this.staticFlickerActive = true;
      audio.onended = () => {
        this.staticFlickerActive = false;
      };
      audio.play().catch(() => { });
    } catch { }
  }

  private playUnownSequence() {
    const crying = this.unownCrying ?? new Audio("sounds/unown_crying.mp3");
    this.unownCrying = crying;

    try {
      crying.pause();
      crying.currentTime = 0;
      crying.volume = 0.10;
      crying.loop = true;
      crying.playbackRate = this.getSlowerPlaybackRate(crying, .5);
      crying.play().catch(() => { });
    } catch { }
  }

  private getSlowerPlaybackRate(audio: HTMLAudioElement, extraSeconds: number): number {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return Math.max(0.6, audio.duration / (audio.duration + extraSeconds));
    }

    return 0.85;
  }

  private stopSecretAudio() {
    [this.brokenGlass, this.unownCrying, this.staticAudio].forEach(audio => {
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch { }
    });
    this.staticFlickerActive = false;
  }
}
