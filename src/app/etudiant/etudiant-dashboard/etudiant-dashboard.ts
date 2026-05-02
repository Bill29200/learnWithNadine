import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant } from '../../services/database.service';
import { User } from '../../model/user.model';

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
  isLoading: boolean = true;

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

  // Méthode de recherche multi-critères améliorée
  get filteredFormations(): FormationDetail[] {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return this.formations;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/);

    return this.formations.filter(formation => {
      // 1. Recherche dans l'intitulé
      const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);

      // 2. Recherche dans la description
      const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);

      // 3. Recherche dans le programme
      const programmeMatch = formation.programme.some(point =>
        point.toLowerCase().includes(searchTermLower)
      );

      // 4. Recherche dans la durée
      const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);

      // 5. Recherche dans le prix
      const prixString = formation.prix.toString();
      const prixAvecEuro = `${formation.prix} €`;
      let prixMatch = prixString.includes(searchTermLower) ||
        prixAvecEuro.toLowerCase().includes(searchTermLower);

      if (!prixMatch && searchTermLower.includes('€')) {
        const prixSansEuro = searchTermLower.replace('€', '').trim();
        prixMatch = prixString.includes(prixSansEuro);
      }

      // 6. Recherche dans le formateur
      const formateur = this.databaseService.getFormateurById(formation.idFormateur);
      let formateurMatch = false;
      if (formateur) {
        formateurMatch = formateur.nom.toLowerCase().includes(searchTermLower) ||
          formateur.prenom.toLowerCase().includes(searchTermLower) ||
          formateur.specialite.toLowerCase().includes(searchTermLower) ||
          `${formateur.prenom} ${formateur.nom}`.toLowerCase().includes(searchTermLower);
      }

      // 7. Recherche par mots-clés multiples
      let multiWordMatch = false;
      if (searchWords.length > 1) {
        multiWordMatch = searchWords.every(word =>
          formation.intitule.toLowerCase().includes(word) ||
          formation.description.toLowerCase().includes(word) ||
          formation.programme.some(p => p.toLowerCase().includes(word)) ||
          (formateur && (formateur.prenom.toLowerCase().includes(word) ||
            formateur.nom.toLowerCase().includes(word)))
        );
      }

      return intituleMatch || descriptionMatch || programmeMatch ||
        dureeMatch || prixMatch || formateurMatch || multiWordMatch;
    });
  }

  // Mise en évidence des termes recherchés
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

  getStudentCardColor(index: number): string {
    const colors = [
      'linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%)',
      'linear-gradient(135deg, #F0FFF4 0%, #E0FFE8 100%)',
      'linear-gradient(135deg, #EBF8FF 0%, #D0EEFF 100%)',
      'linear-gradient(135deg, #FFF9E6 0%, #FFF0CC 100%)',
      'linear-gradient(135deg, #F3E8FF 0%, #E8D5FF 100%)',
      'linear-gradient(135deg, #FFE0F0 0%, #FFCCE6 100%)',
      'linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%)',
      'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      'linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)',
    ];
    return colors[index % colors.length];
  }

  getStudentIconColor(index: number): string {
    const iconColors = [
      '#e74c3c', '#27ae60', '#2980b9', '#f39c12', '#8e44ad',
      '#e91e63', '#00bcd4', '#4caf50', '#ff9800', '#3f51b5'
    ];
    return iconColors[index % iconColors.length];
  }
}
