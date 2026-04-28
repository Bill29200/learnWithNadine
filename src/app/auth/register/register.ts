import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Role, User } from '../../model/user.model';
import { AuthService } from '../../services/auth';

type RegisterForm = Omit<User, 'role'> & { role: Role | '' };

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
  user: RegisterForm = {
    id: 0,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: ''
  };
  successMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.user.role === '') {
      return;
    }

    const registerUser: User = {
      ...this.user,
      role: this.user.role
    };

    if (this.auth.register(registerUser)) {
      this.successMessage = 'Compte créé avec succès !';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
