import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appCertificate]'
})
export class CertificateDirective implements OnChanges {
  @Input() appCertificate: boolean = false;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appCertificate'] && this.appCertificate) {
      this.renderer.addClass(this.el.nativeElement, "gold-text");
    }
  }
}