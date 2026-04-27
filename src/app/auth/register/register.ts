import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  user: User = {
    id: 0,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'userStudent'
  };
  successMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.auth.register(this.user)) {
      this.successMessage = 'Compte créé avec succès !';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
