import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur } from '../../services/database.service';
import { User } from '../../model/user.model';

@Component({
  selector: 'app-etudiant-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './etudiant-dashboard.html',
  styleUrl: './etudiant-dashboard.css',
  standalone: true
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
  isLoading: boolean = true;

  // Pour le modal de détails
  selectedFormation: FormationDetail | null = null;
  showDetailModal: boolean = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    if (this.currentUser) {
      this.etudiantInfo = this.databaseService.getEtudiantById(this.currentUser.id) || null;
      this.loadData();
    }

    this.databaseService.getDatabase$().subscribe(() => {
      this.loadData();
    });
  }

  loadData() {
    this.formations = this.databaseService.getFormationsValides();
    this.mesInscriptions = this.databaseService.getInscriptionsByEtudiant(this.currentUser!.id);
    this.mesFormations = this.mesInscriptions
      .map(inscription => this.databaseService.getFormationById(inscription.idFormation))
      .filter((formation): formation is FormationDetail => formation !== undefined);
    this.isLoading = false;
  }

  onSearch() {
    // Le getter filteredFormations gère automatiquement la recherche
  }

  get filteredFormations(): FormationDetail[] {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return this.formations;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/);

    return this.formations.filter(formation => {
      const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);
      const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);
      const programmeMatch = formation.programme.some(point => point.toLowerCase().includes(searchTermLower));
      const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);
      const prixString = formation.prix.toString();
      const prixAvecEuro = `${formation.prix} €`;
      let prixMatch = prixString.includes(searchTermLower) || prixAvecEuro.toLowerCase().includes(searchTermLower);

      if (!prixMatch && searchTermLower.includes('€')) {
        const prixSansEuro = searchTermLower.replace('€', '').trim();
        prixMatch = prixString.includes(prixSansEuro);
      }

      const formateur = this.databaseService.getFormateurById(formation.idFormateur);
      let formateurMatch = false;
      if (formateur) {
        formateurMatch = formateur.nom.toLowerCase().includes(searchTermLower) ||
          formateur.prenom.toLowerCase().includes(searchTermLower) ||
          formateur.specialite.toLowerCase().includes(searchTermLower) ||
          `${formateur.prenom} ${formateur.nom}`.toLowerCase().includes(searchTermLower);
      }

      let multiWordMatch = false;
      if (searchWords.length > 1) {
        multiWordMatch = searchWords.every(word =>
          formation.intitule.toLowerCase().includes(word) ||
          formation.description.toLowerCase().includes(word) ||
          formation.programme.some(p => p.toLowerCase().includes(word)) ||
          (formateur && (formateur.prenom.toLowerCase().includes(word) || formateur.nom.toLowerCase().includes(word)))
        );
      }

      return intituleMatch || descriptionMatch || programmeMatch || dureeMatch || prixMatch || formateurMatch || multiWordMatch;
    });
  }

  highlightText(text: string): string {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return text;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/);
    let result = text;

    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sortedWords = [...searchWords].sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    return result;
  }

  isInscrit(formationId: number): boolean {
    return this.mesInscriptions.some(inscription => inscription.idFormation === formationId);
  }

  formationDejaInscrit(formationId: number): boolean {
    return this.isInscrit(formationId);
  }

  voirDetails(formation: FormationDetail) {
    this.selectedFormation = formation;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedFormation = null;
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
    this.loadData();
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

  // Méthodes pour les statistiques
  getFormateurName(idFormateur: number): string {
    const formateur = this.databaseService.getFormateurById(idFormateur);
    return formateur ? `${formateur.prenom} ${formateur.nom}` : 'Non défini';
  }

  getFormateurSpecialite(idFormateur: number): string {
    const formateur = this.databaseService.getFormateurById(idFormateur);
    return formateur ? formateur.specialite : 'Non définie';
  }

  getInscriptionsPayeesCount(): number {
    return this.mesInscriptions.filter(i => i.statut === 'paye').length;
  }

  getTotalDepense(): number {
    let total = 0;
    this.mesInscriptions.forEach(inscription => {
      if (inscription.statut === 'paye') {
        const formation = this.databaseService.getFormationById(inscription.idFormation);
        if (formation) {
          total += formation.prix;
        }
      }
    });
    return total;
  }
}
