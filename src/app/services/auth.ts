import { Injectable } from '@angular/core';
import { Role, User } from '../model/user.model';
import { Admin, DatabaseService, Etudiant, Formateur } from './database.service';
import { StorageService } from './storage';

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
            phone: '',
            role: 'userAdmin',
            level: undefined,
            specialty: ''
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
            phone: user.tel,
            role: 'userTrainer',
            level: user.niveau as any,
            specialty: user.specialite
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
            phone: user.tel,
            role: 'userStudent',
            level: user.niveau as any,
            specialty: ''
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
    if (user.role === 'userTrainer') {
      const formateur = {
        nom: user.lastName,
        prenom: user.firstName,
        tel: user.phone,
        mail: user.email,
        motpass: user.password,
        niveau: user.level as string || 'autre',
        specialite: user.specialty || '',
        photo: '',
        statut: 'actif' as const
      };
      this.databaseService.addFormateur(formateur);
    } else if (user.role === 'userStudent') {
      const etudiant = {
        nom: user.lastName,
        prenom: user.firstName,
        mail: user.email,
        tel: user.phone,
        niveau: user.level as string || 'bac+1',
        motpass: user.password,
        statut: 'actif' as const,
        photo: ''
      };
      this.databaseService.addEtudiant(etudiant);
    }
    // Pour admin, peut-être ajouter plus tard, mais pour l'instant, utiliser localStorage ou autre
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
