import { Injectable } from '@angular/core';
import { Admin, DatabaseService, Etudiant, Formateur } from './database.service';
import { StorageService } from './storage';

type Role = 'userAdmin' | 'userTrainer' | 'userStudent';

interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  constructor(private databaseService: DatabaseService, private storage: StorageService) {
    this.loadUser();
  }

  private loadUser() {
    const user = this.storage.getItem('currentUser');
    if (user) this.currentUser = user;
  }

  login(email: string, password: string, role: string): boolean {
    let user: any = null;

    // Recherche selon le rôle sélectionné
    switch (role) {
      case 'admin':
        user = this.databaseService.getAdmins().find((admin: Admin) =>
          admin.email === email && admin.motpass === password
        );
        if (user) {
          this.currentUser = {
            id: user.id,
            email: user.email,
            password: user.motpass,
            firstName: user.nom,
            lastName: '',
            role: 'userAdmin'
          };
        }
        break;

      case 'formateur':
        user = this.databaseService.getFormateurs().find((formateur: Formateur) =>
          formateur.mail === email && formateur.motpass === password
        );
        if (user) {
          this.currentUser = {
            id: user.idFormateur,
            email: user.mail,
            password: user.motpass,
            firstName: user.prenom,
            lastName: user.nom,
            role: 'userTrainer'
          };
        }
        break;

      case 'etudiant':
        user = this.databaseService.getEtudiants().find((etudiant: Etudiant) =>
          etudiant.mail === email && etudiant.motpass === password
        );
        if (user) {
          this.currentUser = {
            id: user.idEtudiant,
            email: user.mail,
            password: user.motpass,
            firstName: user.prenom,
            lastName: user.nom,
            role: 'userStudent'
          };
        }
        break;
    }

    if (this.currentUser) {
      this.storage.setItem('currentUser', this.currentUser);
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
