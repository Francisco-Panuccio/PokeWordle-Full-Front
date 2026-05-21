import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-policies',
  imports: [],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.css'
})
export class PoliciesComponent {
  private router = inject(Router);

  goBack() { this.router.navigateByUrl("/home"); }
}
