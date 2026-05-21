import { Component, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-rules',
  imports: [],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.css'
})
export class RulesComponent {
  @Output() closed = new EventEmitter<void>();

  @HostListener('window:keydown.escape')
  close() {
    this.closed.emit();
  }
}