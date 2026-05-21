import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { brokenGlassAudio, unownSecretImages } from '../../constants';
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
  private unownTimeout?: number;

  crackedImage = "images/cracked.png";
  unownMessage = ["we", "watch", "you"];
  secretActive = false;
  showUnownMessage = false;

  async ngOnInit() {
    await preloadImagesOnce(unownSecretImages);
    const [audio] = await preloadAudiosOnce(brokenGlassAudio);
    this.brokenGlass = audio;
  }

  ngOnDestroy() {
    if (this.unownTimeout) window.clearTimeout(this.unownTimeout);
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
    }, 2000);
  }

  private playBrokenGlass() {
    const audio = this.brokenGlass ?? new Audio("sounds/broken_glass.mp3");
    this.brokenGlass = audio;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.8;
      audio.play().catch(() => { });
    } catch { }
  }
}
