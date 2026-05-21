import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-errors',
  imports: [],
  templateUrl: './form-errors.component.html',
  styleUrl: './form-errors.component.css'
})
export class FormErrorsComponent {
  @Input() control!: AbstractControl | null;

  errorMessages() {
    if (!this.control || !this.control.errors) return [];

    const errors = this.control.errors;
    let general_return = "Error Desconocido";

    if (errors["required"]) general_return = ("Required Field");
    if (errors["minlength"]) general_return = (`Minimum ${errors['minlength'].requiredLength} Characters`);
    if (errors["maxlength"]) general_return = (`Maximum ${errors['maxlength'].requiredLength} Characters`);
    if (errors["email"]) general_return = ("Requires Email Format");

    return general_return;
  }
}