import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatabaseService, FormationDetail, Formateur, Etudiant, Inscription } from '../services/database.service';

@Component({
  selector: 'app-main',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class MainComponent implements OnInit {
  formations: FormationDetail[] = [];
  filteredFormations: FormationDetail[] = [];
  searchTerm: string = '';

  // Pour la vue détaillée
  selectedFormation: FormationDetail | null = null;
  formateurInfo: Formateur | null = null;
  etudiantsInscrits: { etudiant: Etudiant, inscription: Inscription }[] = [];
  showDetailModal: boolean = false;

  constructor(
    private databaseService: DatabaseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('MainComponent: Démarrage du chargement des formations...');

    this.databaseService.getDatabase$().subscribe({
      next: (database) => {
        if (database) {
          console.log('MainComponent: Base de données reçue', database);
          this.formations = this.databaseService.getFormationsValides();
          this.filteredFormations = this.formations;
          console.log('MainComponent: Formations valides chargées:', this.formations);
          console.log('MainComponent: Nombre de formations:', this.formations.length);
          this.cdr.detectChanges();
        } else {
          console.log('MainComponent: Base de données null');
        }
      },
      error: (err) => {
        console.error('MainComponent: Erreur lors du chargement des formations:', err);
        this.cdr.detectChanges();
      }
    });

    if (!this.databaseService.getDatabase()) {
      this.databaseService.loadDatabase().subscribe();
    }
  }

  // Méthode de recherche multi-critères améliorée
  onSearch() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredFormations = this.formations;
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/); // Découpe en mots pour recherche plus précise

    this.filteredFormations = this.formations.filter(formation => {
      // 1. Recherche dans l'intitulé (nom)
      const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);

      // 2. Recherche dans la description
      const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);

      // 3. Recherche dans le programme (chaque point du programme)
      const programmeMatch = formation.programme.some(point =>
        point.toLowerCase().includes(searchTermLower)
      );

      // 4. Recherche dans la durée (supporte: "35h", "35 heures", "35")
      const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);

      // 5. Recherche avancée dans le prix (supporte: "299", "299€", "299 euros", "299.00")
      const prixString = formation.prix.toString();
      const prixAvecEuro = `${formation.prix} €`;
      const prixAvecEuros = `${formation.prix} euros`;
      const prixAvecPoint = `${formation.prix}.00 €`;

      let prixMatch = prixString.includes(searchTermLower) ||
        prixAvecEuro.toLowerCase().includes(searchTermLower) ||
        prixAvecEuros.toLowerCase().includes(searchTermLower) ||
        prixAvecPoint.toLowerCase().includes(searchTermLower);

      // Support des recherches comme "299€" sans espace
      if (!prixMatch && searchTermLower.includes('€')) {
        const prixSansEuro = searchTermLower.replace('€', '').trim();
        prixMatch = prixString.includes(prixSansEuro);
      }

      // 6. Recherche dans le formateur (nom, prénom, spécialité)
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

      // Retourne vrai si au moins un champ correspond
      return intituleMatch || descriptionMatch || programmeMatch ||
        dureeMatch || prixMatch || formateurMatch || multiWordMatch;
    });
  }

  // Méthode pour obtenir la couleur de la carte
  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 10}`;
  }

  // Méthode pour mettre en évidence les termes recherchés
  highlightText(text: string): string {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      return text;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    const searchWords = searchTermLower.split(/\s+/);

    let result = text;

    // Échapper les caractères spéciaux pour la regex
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Trier les mots par longueur décroissante pour éviter les chevauchements
    const sortedWords = [...searchWords].sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    return result;
  }

  // Ouvrir les détails d'une formation
  voirDetails(formation: FormationDetail) {
    this.selectedFormation = formation;
    this.formateurInfo = this.databaseService.getFormateurById(formation.idFormateur) || null;

    const inscriptions = this.databaseService.getInscriptionsByFormation(formation.idFormation);
    this.etudiantsInscrits = [];
    inscriptions.forEach(inscription => {
      const etudiant = this.databaseService.getEtudiantById(inscription.idEtudiant);
      if (etudiant) {
        this.etudiantsInscrits.push({
          etudiant: etudiant,
          inscription: inscription
        });
      }
    });

    this.showDetailModal = true;
  }

  // Fermer le modal
  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedFormation = null;
    this.formateurInfo = null;
    this.etudiantsInscrits = [];
  }

  // Couleurs pour les cartes étudiants
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
