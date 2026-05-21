import { Directive, ElementRef, Input, SimpleChanges } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appBackgroundRegions]'
})
export class BackgroundRegionsDirective {
  @Input('appBackgroundRegions') region: string = "";

  constructor(private el: ElementRef) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ("region" in changes) {
      this.setBackgroundColor(this.region);
    }
  }

  private setBackgroundColor(region: string) {
    const el = this.el.nativeElement;
    let color = "";

    switch (region.toLowerCase()) {
      case "unova":
      case "alola":
      case "galar":
      case "paldea":
        color = "#444444";
        el.style.backgroundColor = color;
        el.style.objectFit = "contain";
        break;
      case "sinnoh":
        color = "#707070";
        el.style.backgroundColor = color;
        el.style.objectFit = "contain";
        break;
      case "tournament":
        color = "#2A292F";
        el.style.backgroundColor = color;
        el.style.objectFit = "contain";
        break;
      default:
        el.style.backgroundColor = "";
        el.style.objectFit = "";
        break;
    }
  }
}
