import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from '../loading/loading.component';
import { FreeWordleComponent } from '../free-wordle/free-wordle.component';
import { PreloadService } from '../../services/preload.service';

@Component({
  standalone: true,
  selector: 'app-play',
  imports: [CommonModule, LoadingComponent, FreeWordleComponent],
  templateUrl: './play.component.html',
  styleUrl: './play.component.css'
})
export class PlayComponent implements OnInit {
  private preload = inject(PreloadService);
  loading: boolean = true;

  async ngOnInit() {
    await this.preload.preloadFree();
    this.loading = false;
  }
}
