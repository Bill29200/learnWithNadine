import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';
import { DatabaseService, Etudiant, FormationDetail, Inscription } from '../../services/database.service';

@Component({
  selector: 'app-etudiant-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './etudiant-dashboard.html',
  styleUrl: './etudiant-dashboard.css',
})
export class EtudiantDashboard implements OnInit {
  currentUser: User | null = null;
  etudiantInfo: Etudiant | null = null;
  formations: FormationDetail[] = [];
  mesInscriptions: Inscription[] = [];
  mesFormations: FormationDetail[] = [];
  searchTerm: string = '';
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private auth: AuthService,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    if (this.currentUser) {
      // Récupérer les informations complètes de l'étudiant
      this.etudiantInfo = this.databaseService.getEtudiantById(this.currentUser.id) || null;
      this.loadData();
    }
  }

  loadData() {
    // Charger les formations valides
    this.formations = this.databaseService.getFormationsValides();

    // Charger les inscriptions de l'étudiant
    this.mesInscriptions = this.databaseService.getInscriptionsByEtudiant(this.currentUser!.id);

    // Charger les formations auxquelles l'étudiant est inscrit
    this.mesFormations = this.mesInscriptions
      .map(inscription => this.databaseService.getFormationById(inscription.idFormation))
      .filter((formation): formation is FormationDetail => formation !== undefined);
  }

  get filteredFormations(): FormationDetail[] {
    if (this.searchTerm.trim() === '') {
      return this.formations;
    }
    return this.formations.filter(formation =>
      formation.intitule.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      formation.description.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  isInscrit(formationId: number): boolean {
    return this.mesInscriptions.some(inscription => inscription.idFormation === formationId);
  }

  formationDejaInscrit(formationId: number): boolean {
    return this.isInscrit(formationId);
  }

  sInscrire(formation: FormationDetail) {
    if (this.isInscrit(formation.idFormation)) {
      this.showMessage('Vous êtes déjà inscrit à cette formation !', 'error');
      return;
    }

    const nouvelleInscription: Omit<Inscription, 'idInscription'> = {
      idFormation: formation.idFormation,
      idEtudiant: this.currentUser!.id,
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'non paye'
    };

    this.databaseService.addInscription(nouvelleInscription);
    this.loadData(); // Recharger les données
    this.showMessage(`Inscription réussie à la formation "${formation.intitule}" !`, 'success');
  }

  showMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getFullName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return 'Étudiant';
  }

  getInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`;
    }
    return 'E';
  }

  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 10}`;
  }
}
