import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DatabaseService, FormationDetail } from '../services/database.service';

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

  constructor(private databaseService: DatabaseService, private router: Router) {}

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
        } else {
          console.log('MainComponent: Base de données null');
        }
      },
      error: (err) => {
        console.error('MainComponent: Erreur lors du chargement des formations:', err);
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

  voirFormation(id: number) {
    this.router.navigate(['/formation', id]);
  }
}
