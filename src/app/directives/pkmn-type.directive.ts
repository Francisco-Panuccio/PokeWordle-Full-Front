import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from "@angular/core";

@Directive({
  selector: '[appPkmnType]'
})
export class PkmnTypeDirective implements OnChanges {
  @Input("appPkmnType") pokemonType: string | null = null;

  private typeColors: Record<string, string> = {
    normal: "#A8A878",
    fire: "#F08030",
    water: "#6890F0",
    electric: "#F8D030",
    grass: "#78C850",
    ice: "#98D8D8",
    fighting: "#C03028",
    poison: "#A040A0",
    ground: "#E0C068",
    flying: "#A890F0",
    psychic: "#F85888",
    bug: "#A8B820",
    rock: "#B8A038",
    ghost: "#705898",
    dragon: "#7038F8",
    dark: "#705848",
    steel: "#B8B8D0",
    fairy: "#F0B6BC"
  };

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ("pokemonType" in changes) {
      const background_color = this.pokemonType ? this.typeColors[this.pokemonType.toLowerCase()] : null;
      if (background_color) {
        this.renderer.setStyle(this.el.nativeElement, "background-color", background_color);
      } else {
        this.renderer.removeStyle(this.el.nativeElement, "background-color");
      }
    }
  }

}
