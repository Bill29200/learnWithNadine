import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatabaseService, Etudiant, Formateur, FormationDetail, Inscription } from '../services/database.service';

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
    // Charger la base de données et récupérer les formations valides
    console.log('MainComponent: Démarrage du chargement des formations...');

    // Utiliser l'observable pour réagir aux changements de données
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

    // Charger les données si elles ne sont pas encore chargées
    if (!this.databaseService.getDatabase()) {
      this.databaseService.loadDatabase().subscribe();
    }
  }

  onSearch() {
    if (this.searchTerm.trim() === '') {
      this.filteredFormations = this.formations;
    } else {
      this.filteredFormations = this.formations.filter(formation =>
        formation.intitule.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        formation.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 10}`;
  }

  // Nouvelle méthode pour voir les détails d'une formation
  voirDetails(formation: FormationDetail) {
    this.selectedFormation = formation;

    // Récupérer les informations du formateur
    this.formateurInfo = this.databaseService.getFormateurById(formation.idFormateur) || null;

    // Récupérer les inscriptions pour cette formation
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

  // Fermer le modal de détails
  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedFormation = null;
    this.formateurInfo = null;
    this.etudiantsInscrits = [];
  }

  getInscriptionStatutBadgeClass(statut: string): string {
    return statut === 'paye' ? 'badge bg-success' : 'badge bg-warning text-dark';
  }

  // Rediriger vers l'inscription (si connecté)
  sInscrire(formationId: number) {
    this.router.navigate(['/inscription', formationId]);
  }
}
