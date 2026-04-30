import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';
import { Admin, Database, DatabaseService, Etudiant, Formateur, FormationDetail, Inscription } from '../../services/database.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit, OnDestroy {
  currentUser: User | null = null;
  adminInfo: Admin | null = null;
  private dbSubscription: Subscription | null = null;

  // Données de la base
  formations: FormationDetail[] = [];
  inscriptions: Inscription[] = [];
  etudiants: Etudiant[] = [];
  formateurs: Formateur[] = [];

  // Formations filtrées
  filteredFormations: FormationDetail[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'all';

  // Inscriptions filtrées
  filteredInscriptions: Inscription[] = [];
  inscriptionSearchTerm: string = '';

  // Statistiques
  stats = {
    totalFormations: 0,
    formationsValides: 0,
    formationsNonValides: 0,
    totalInscriptions: 0,
    inscriptionsPaye: 0,
    inscriptionsNonPaye: 0,
    totalEtudiants: 0,
    etudiantsActifs: 0,
    totalFormateurs: 0,
    formateursActifs: 0,
    revenuTotal: 0
  };

  // État de chargement
  isLoading: boolean = true;

  // Onglet actif
  activeTab: string = 'formations';

  // Message
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private auth: AuthService,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();

    // S'abonner aux changements de la base de données
    this.dbSubscription = this.databaseService.getDatabase$().subscribe({
      next: (database: Database | null) => {
        if (database) {
          console.log('AdminDashboard: Données reçues de Firebase', database);
          this.loadDataFromDatabase(database);
          this.isLoading = false;
        } else {
          console.log('AdminDashboard: En attente des données...');
          // Charger les données si elles ne sont pas encore disponibles
          if (!this.databaseService.getDatabase()) {
            this.databaseService.loadDatabase().subscribe();
          }
        }
      },
      error: (err) => {
        console.error('AdminDashboard: Erreur lors du chargement des données', err);
        this.isLoading = false;
        this.showMessage('Erreur lors du chargement des données', 'error');
      }
    });

    // Récupérer les infos admin
    if (this.currentUser) {
      this.adminInfo = this.databaseService.getAdminById(this.currentUser.id) || null;
    }
  }

  ngOnDestroy() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
    }
  }

  loadDataFromDatabase(database: Database) {
    // Charger toutes les données depuis la base
    this.formations = database.formations || [];
    this.inscriptions = database.inscriptions || [];
    this.etudiants = database.etudiants || [];
    this.formateurs = database.formateurs || [];

    // Initialiser les tableaux filtrés
    this.filteredFormations = [...this.formations];
    this.filteredInscriptions = [...this.inscriptions];

    // Mettre à jour les statistiques
    this.updateStats();

    console.log('AdminDashboard: Données chargées - Formations:', this.formations.length);
    console.log('AdminDashboard: Données chargées - Inscriptions:', this.inscriptions.length);
    console.log('AdminDashboard: Données chargées - Étudiants:', this.etudiants.length);
    console.log('AdminDashboard: Données chargées - Formateurs:', this.formateurs.length);
  }

  updateStats() {
    this.stats = {
      totalFormations: this.formations.length,
      formationsValides: this.formations.filter(f => f.statut === 'valide').length,
      formationsNonValides: this.formations.filter(f => f.statut === 'nonValide').length,
      totalInscriptions: this.inscriptions.length,
      inscriptionsPaye: this.inscriptions.filter(i => i.statut === 'paye').length,
      inscriptionsNonPaye: this.inscriptions.filter(i => i.statut === 'non paye').length,
      totalEtudiants: this.etudiants.length,
      etudiantsActifs: this.etudiants.filter(e => e.statut === 'actif').length,
      totalFormateurs: this.formateurs.length,
      formateursActifs: this.formateurs.filter(f => f.statut === 'actif').length,
      revenuTotal: this.inscriptions
        .filter(i => i.statut === 'paye')
        .reduce((sum, i) => {
          const formation = this.formations.find(f => f.idFormation === i.idFormation);
          return sum + (formation?.prix || 0);
        }, 0)
    };
  }

  // Rafraîchir toutes les données
  refreshData() {
    this.isLoading = true;
    this.databaseService.loadDatabase().subscribe({
      next: (database) => {
        this.loadDataFromDatabase(database);
        this.isLoading = false;
        this.showMessage('Données actualisées avec succès', 'success');
      },
      error: (err) => {
        console.error('Erreur lors du rafraîchissement', err);
        this.isLoading = false;
        this.showMessage('Erreur lors de l\'actualisation des données', 'error');
      }
    });
  }

  // Filtrage des formations
  onSearchFormations() {
    this.applyFormationFilters();
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  applyFormationFilters() {
    let filtered = [...this.formations];

    // Filtre par recherche
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(formation =>
        formation.intitule.toLowerCase().includes(term) ||
        formation.description.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (this.selectedStatut !== 'all') {
      filtered = filtered.filter(formation => formation.statut === this.selectedStatut);
    }

    this.filteredFormations = filtered;
  }

  // Changer le statut d'une formation
  toggleFormationStatut(formation: FormationDetail) {
    const nouveauStatut = formation.statut === 'valide' ? 'nonValide' : 'valide';
    this.databaseService.updateFormation(formation.idFormation, { statut: nouveauStatut });

    // Mettre à jour localement
    formation.statut = nouveauStatut;
    this.updateStats();
    this.applyFormationFilters();

    this.showMessage(`Formation "${formation.intitule}" ${nouveauStatut === 'valide' ? 'validée' : 'invalidée'} avec succès !`, 'success');
  }

  // Filtrer les inscriptions
  onSearchInscriptions() {
    if (this.inscriptionSearchTerm.trim() === '') {
      this.filteredInscriptions = [...this.inscriptions];
    } else {
      const term = this.inscriptionSearchTerm.toLowerCase();
      this.filteredInscriptions = this.inscriptions.filter(inscription => {
        const formation = this.getFormationById(inscription.idFormation);
        const etudiant = this.getEtudiantById(inscription.idEtudiant);
        return formation?.intitule.toLowerCase().includes(term) ||
               etudiant?.nom.toLowerCase().includes(term) ||
               etudiant?.prenom.toLowerCase().includes(term) ||
               `${etudiant?.prenom} ${etudiant?.nom}`.toLowerCase().includes(term);
      });
    }
  }

  // Changer le statut d'une inscription
  toggleInscriptionStatut(inscription: Inscription) {
    const nouveauStatut = inscription.statut === 'paye' ? 'non paye' : 'paye';
    this.databaseService.updateInscription(inscription.idInscription, { statut: nouveauStatut });

    // Mettre à jour localement
    inscription.statut = nouveauStatut;
    this.updateStats();

    const etudiant = this.getEtudiantById(inscription.idEtudiant);
    const formation = this.getFormationById(inscription.idFormation);
    this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" marquée comme ${nouveauStatut === 'paye' ? 'payée' : 'non payée'}`, 'success');
  }

  // Supprimer une inscription
  deleteInscription(inscription: Inscription) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
      this.databaseService.deleteInscription(inscription.idInscription);

      // Supprimer localement
      const index = this.inscriptions.findIndex(i => i.idInscription === inscription.idInscription);
      if (index !== -1) {
        this.inscriptions.splice(index, 1);
        this.filteredInscriptions = [...this.inscriptions];
        this.updateStats();
      }

      const etudiant = this.getEtudiantById(inscription.idEtudiant);
      const formation = this.getFormationById(inscription.idFormation);
      this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" supprimée`, 'success');
    }
  }

  // Supprimer une formation
  deleteFormation(formation: FormationDetail) {
    // Vérifier si des inscriptions existent pour cette formation
    const inscriptionsLiees = this.inscriptions.filter(i => i.idFormation === formation.idFormation);
    if (inscriptionsLiees.length > 0) {
      if (!confirm(`Cette formation a ${inscriptionsLiees.length} inscription(s). Les supprimer également ?`)) {
        return;
      }
      // Supprimer les inscriptions liées
      inscriptionsLiees.forEach(ins => {
        this.databaseService.deleteInscription(ins.idInscription);
      });
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?`)) {
      this.databaseService.deleteFormation(formation.idFormation);

      // Supprimer localement
      const index = this.formations.findIndex(f => f.idFormation === formation.idFormation);
      if (index !== -1) {
        this.formations.splice(index, 1);
        // Supprimer aussi les inscriptions liées localement
        this.inscriptions = this.inscriptions.filter(i => i.idFormation !== formation.idFormation);
        this.filteredInscriptions = [...this.inscriptions];
        this.applyFormationFilters();
        this.updateStats();
      }

      this.showMessage(`Formation "${formation.intitule}" supprimée`, 'success');
    }
  }

  // Objets helper
  getFormationById(id: number): FormationDetail | undefined {
    return this.formations.find(f => f.idFormation === id);
  }

  getEtudiantById(id: number): Etudiant | undefined {
    return this.etudiants.find(e => e.idEtudiant === id);
  }

  getFormateurById(id: number): Formateur | undefined {
    return this.formateurs.find(f => f.idFormateur === id);
  }

  getFormationStatutBadgeClass(statut: string): string {
    return statut === 'valide' ? 'badge bg-success' : 'badge bg-warning text-dark';
  }

  getInscriptionStatutBadgeClass(statut: string): string {
    return statut === 'paye' ? 'badge bg-success' : 'badge bg-danger';
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
    return 'Administrateur';
  }

  getInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`;
    }
    return 'A';
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
