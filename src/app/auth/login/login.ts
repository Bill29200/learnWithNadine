import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
// import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.auth.login(this.email, this.password)) {
      const userRole = this.auth.getUserRole();
      if (userRole === 'userAdmin') {
        this.router.navigate(['/formateur']);
      } else if (userRole === 'userTrainer') {
        this.router.navigate(['/formateur']);
      } else if (userRole === 'userStudent') {
        this.router.navigate(['/etudiant']);
      }
    } else {
      this.errorMessage = 'Email ou mot de passe incorrect';
    }
  }
}
