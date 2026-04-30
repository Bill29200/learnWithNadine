import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';
import { DatabaseService, Formateur } from '../../services/database.service';

@Component({
  selector: 'app-formateur-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './formateur-dashboard.html',
  styleUrl: './formateur-dashboard.css',
})
export class FormateurDashboard implements OnInit {
  currentUser: User | null = null;
  formateurInfo: Formateur | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    if (this.currentUser) {
      // Récupérer les informations complètes du formateur depuis la base de données
      this.formateurInfo = this.databaseService.getFormateurById(this.currentUser.id) || null;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getFullName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return 'Formateur';
  }

  getInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`;
    }
    return 'F';
  }
}
