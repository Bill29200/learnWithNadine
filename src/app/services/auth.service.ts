import { Injectable } from '@angular/core';
// import { Router } from '@angular/router';
import { Role, User } from '../model/user.model';
import { StorageService } from './storage';

// type Role = 'userAdmin' | 'userTrainer' | 'userStudent';

// interface User {
//   id: number;
//   email: string;
//   password: string;
//   nom: string;
//   prenom: string;
//   role: Role;
// }

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  constructor(/*private router: Router,*/ private storage: StorageService) {
    this.loadUser();
  }

  private loadUser() {
    const user = this.storage.getItem('currentUser');
    if (user) this.currentUser = user;
  }

  login(email: string, password: string): boolean {
    const users = this.storage.getItem('users') || [];
    const user = users.find((u: User) => u.email === email && u.password === password);

    if (user) {
      this.currentUser = user;
      this.storage.setItem('currentUser', user);
      return true;
    }
    return false;
  }

  register(user: User): boolean {
    const users = this.storage.getItem('users') || [];
    user.id = Date.now();
    users.push(user);
    this.storage.setItem('users', users);
    return true;
  }

  logout() {
    this.currentUser = null;
    this.storage.removeItem('currentUser');
    // Navigation will be handled by the component
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUserRole(): Role | null {
    return this.currentUser?.role || null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  hasRole(allowedRoles: Role[]): boolean {
    if (!this.currentUser) return false;
    return allowedRoles.includes(this.currentUser.role);
  }
}
