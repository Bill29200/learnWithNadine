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
    this.formations = database.formations || [];
    this.inscriptions = database.inscriptions || [];
    this.etudiants = database.etudiants || [];
    this.formateurs = database.formateurs || [];

    this.filteredFormations = [...this.formations];
    this.filteredInscriptions = [...this.inscriptions];

    this.updateStats();
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

  // ============ MÉTHODES DE CONFIRMATION AVEC BOÎTES DE DIALOGUE ============

  // Confirmation suppression formation
  confirmDeleteFormation(formation: FormationDetail) {
    const inscriptionsLiees = this.inscriptions.filter(i => i.idFormation === formation.idFormation);
    let message = `Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?\n\n`;

    if (inscriptionsLiees.length > 0) {
      message += `⚠️ Attention : Cette formation a ${inscriptionsLiees.length} inscription(s) liée(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;

    if (confirm(message)) {
      this.deleteFormation(formation, inscriptionsLiees);
    }
  }

  // Suppression formation
  private deleteFormation(formation: FormationDetail, inscriptionsLiees: Inscription[]) {
    // Supprimer les inscriptions liées
    inscriptionsLiees.forEach(ins => {
      this.databaseService.deleteInscription(ins.idInscription);
    });

    // Supprimer la formation
    this.databaseService.deleteFormation(formation.idFormation);

    // Mettre à jour localement
    const index = this.formations.findIndex(f => f.idFormation === formation.idFormation);
    if (index !== -1) {
      this.formations.splice(index, 1);
      this.inscriptions = this.inscriptions.filter(i => i.idFormation !== formation.idFormation);
      this.filteredInscriptions = [...this.inscriptions];
      this.applyFormationFilters();
      this.updateStats();
    }

    this.showMessage(`Formation "${formation.intitule}" supprimée avec succès`, 'success');
  }

  // Confirmation suppression étudiant
  confirmDeleteEtudiant(etudiant: Etudiant) {
    const inscriptionsEtudiant = this.inscriptions.filter(i => i.idEtudiant === etudiant.idEtudiant);
    let message = `Êtes-vous sûr de vouloir supprimer l'étudiant "${etudiant.prenom} ${etudiant.nom}" ?\n\n`;

    if (inscriptionsEtudiant.length > 0) {
      message += `⚠️ Attention : Cet étudiant a ${inscriptionsEtudiant.length} inscription(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;

    if (confirm(message)) {
      this.deleteEtudiant(etudiant, inscriptionsEtudiant);
    }
  }

  // Suppression étudiant
  private deleteEtudiant(etudiant: Etudiant, inscriptionsEtudiant: Inscription[]) {
    // Supprimer les inscriptions de l'étudiant
    inscriptionsEtudiant.forEach(ins => {
      this.databaseService.deleteInscription(ins.idInscription);
    });

    // Supprimer l'étudiant
    this.databaseService.deleteEtudiant(etudiant.idEtudiant);

    // Mettre à jour localement
    const index = this.etudiants.findIndex(e => e.idEtudiant === etudiant.idEtudiant);
    if (index !== -1) {
      this.etudiants.splice(index, 1);
      this.inscriptions = this.inscriptions.filter(i => i.idEtudiant !== etudiant.idEtudiant);
      this.filteredInscriptions = [...this.inscriptions];
      this.updateStats();
    }

    this.showMessage(`Étudiant "${etudiant.prenom} ${etudiant.nom}" supprimé avec succès`, 'success');
  }

  // Confirmation suppression formateur
  confirmDeleteFormateur(formateur: Formateur) {
    const formationsFormateur = this.formations.filter(f => f.idFormateur === formateur.idFormateur);
    let message = `Êtes-vous sûr de vouloir supprimer le formateur "${formateur.prenom} ${formateur.nom}" ?\n\n`;

    if (formationsFormateur.length > 0) {
      message += `⚠️ Attention : Ce formateur a ${formationsFormateur.length} formation(s).\n`;
      message += `Ces formations et leurs inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;

    if (confirm(message)) {
      this.deleteFormateur(formateur, formationsFormateur);
    }
  }

  // Suppression formateur
  private deleteFormateur(formateur: Formateur, formationsFormateur: FormationDetail[]) {
    // Pour chaque formation du formateur, supprimer ses inscriptions
    formationsFormateur.forEach(formation => {
      const inscriptionsFormation = this.inscriptions.filter(i => i.idFormation === formation.idFormation);
      inscriptionsFormation.forEach(ins => {
        this.databaseService.deleteInscription(ins.idInscription);
      });
      this.databaseService.deleteFormation(formation.idFormation);
    });

    // Supprimer le formateur
    this.databaseService.deleteFormateur(formateur.idFormateur);

    // Mettre à jour localement
    const index = this.formateurs.findIndex(f => f.idFormateur === formateur.idFormateur);
    if (index !== -1) {
      this.formateurs.splice(index, 1);
      this.formations = this.formations.filter(f => f.idFormateur !== formateur.idFormateur);
      this.inscriptions = this.inscriptions.filter(i => {
        const formation = this.formations.find(f => f.idFormation === i.idFormation);
        return formation !== undefined;
      });
      this.filteredFormations = [...this.formations];
      this.filteredInscriptions = [...this.inscriptions];
      this.applyFormationFilters();
      this.updateStats();
    }

    this.showMessage(`Formateur "${formateur.prenom} ${formateur.nom}" supprimé avec succès`, 'success');
  }

  // Confirmation suppression inscription
  confirmDeleteInscription(inscription: Inscription) {
    const etudiant = this.getEtudiantById(inscription.idEtudiant);
    const formation = this.getFormationById(inscription.idFormation);
    const message = `Êtes-vous sûr de vouloir supprimer l'inscription de "${etudiant?.prenom} ${etudiant?.nom}" à la formation "${formation?.intitule}" ?\n\nCette action est irréversible.`;

    if (confirm(message)) {
      this.deleteInscription(inscription, etudiant, formation);
    }
  }

  // Suppression inscription
  private deleteInscription(inscription: Inscription, etudiant?: Etudiant, formation?: FormationDetail) {
    this.databaseService.deleteInscription(inscription.idInscription);

    // Mettre à jour localement
    const index = this.inscriptions.findIndex(i => i.idInscription === inscription.idInscription);
    if (index !== -1) {
      this.inscriptions.splice(index, 1);
      this.filteredInscriptions = [...this.inscriptions];
      this.updateStats();
    }

    this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" supprimée`, 'success');
  }

  // ============ MÉTHODES EXISTANTES ============

  applyFormationFilters() {
    let filtered = [...this.formations];

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(formation =>
        formation.intitule.toLowerCase().includes(term) ||
        formation.description.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatut !== 'all') {
      filtered = filtered.filter(formation => formation.statut === this.selectedStatut);
    }

    this.filteredFormations = filtered;
  }

  onSearchFormations() {
    this.applyFormationFilters();
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  toggleFormationStatut(formation: FormationDetail) {
    const nouveauStatut = formation.statut === 'valide' ? 'nonValide' : 'valide';
    this.databaseService.updateFormation(formation.idFormation, { statut: nouveauStatut });
    formation.statut = nouveauStatut;
    this.updateStats();
    this.applyFormationFilters();
    this.showMessage(`Formation "${formation.intitule}" ${nouveauStatut === 'valide' ? 'validée' : 'invalidée'}`, 'success');
  }

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
               etudiant?.prenom.toLowerCase().includes(term);
      });
    }
  }

  toggleInscriptionStatut(inscription: Inscription) {
    const nouveauStatut = inscription.statut === 'paye' ? 'non paye' : 'paye';
    this.databaseService.updateInscription(inscription.idInscription, { statut: nouveauStatut });
    inscription.statut = nouveauStatut;
    this.updateStats();
    const etudiant = this.getEtudiantById(inscription.idEtudiant);
    const formation = this.getFormationById(inscription.idFormation);
    this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" marquée comme ${nouveauStatut === 'paye' ? 'payée' : 'non payée'}`, 'success');
  }

  // ============ MÉTHODES HELPER ============

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
