import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Role } from '../../model/user.model';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  constructor(private auth: AuthService, private router: Router) {}

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  hasRole(roles: Role[]): boolean {
    return this.auth.hasRole(roles);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
