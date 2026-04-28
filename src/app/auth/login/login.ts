import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
// import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [CommonModule, RouterModule, FormsModule]
})
export class LoginComponent {
  email = '';
  password = '';
  selectedRole = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.selectedRole) {
      this.errorMessage = 'Veuillez sélectionner votre rôle';
      return;
    }

    if (this.auth.login(this.email, this.password, this.selectedRole)) {
      const userRole = this.auth.getUserRole();
      if (userRole === 'userAdmin') {
        this.router.navigate(['/formateur']);
      } else if (userRole === 'userTrainer') {
        this.router.navigate(['/formateur']);
      } else if (userRole === 'userStudent') {
        this.router.navigate(['/etudiant']);
      }
    } else {
      this.errorMessage = 'Email, mot de passe ou rôle incorrect';
    }
  }
}
