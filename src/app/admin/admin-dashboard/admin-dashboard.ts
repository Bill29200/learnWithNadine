import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';
import { Admin, DatabaseService, Etudiant, Formateur, FormationDetail, Inscription } from '../../services/database.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  currentUser: User | null = null;
  adminInfo: Admin | null = null;

  // Formations
  formations: FormationDetail[] = [];
  filteredFormations: FormationDetail[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'all';

  // Inscriptions
  inscriptions: Inscription[] = [];
  filteredInscriptions: Inscription[] = [];
  inscriptionSearchTerm: string = '';

  // Étudiants et Formateurs
  etudiants: Etudiant[] = [];
  formateurs: Formateur[] = [];

  // Statistiques
  stats = {
    totalFormations: 0,
    formationsValides: 0,
    formationsNonValides: 0,
    totalInscriptions: 0,
    inscriptionsPaye: 0,
    inscriptionsNonPaye: 0,
    totalEtudiants: 0,
    totalFormateurs: 0,
    revenuTotal: 0
  };

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
    if (this.currentUser) {
      this.adminInfo = this.databaseService.getAdminById(this.currentUser.id) || null;
      this.loadData();
    }
  }

  loadData() {
    // Charger les formations
    this.formations = this.databaseService.getFormations();
    this.filteredFormations = [...this.formations];

    // Charger les inscriptions
    this.inscriptions = this.databaseService.getInscriptions();
    this.filteredInscriptions = [...this.inscriptions];

    // Charger les étudiants et formateurs
    this.etudiants = this.databaseService.getEtudiants();
    this.formateurs = this.databaseService.getFormateurs();

    // Mettre à jour les statistiques
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
      totalFormateurs: this.formateurs.length,
      revenuTotal: this.inscriptions
        .filter(i => i.statut === 'paye')
        .reduce((sum, i) => {
          const formation = this.formations.find(f => f.idFormation === i.idFormation);
          return sum + (formation?.prix || 0);
        }, 0)
    };
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
      filtered = filtered.filter(formation =>
        formation.intitule.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        formation.description.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    this.loadData();
    this.showMessage(`Formation "${formation.intitule}" ${nouveauStatut === 'valide' ? 'validée' : 'invalidée'} avec succès !`, 'success');
  }

  // Filtrer les inscriptions
  onSearchInscriptions() {
    if (this.inscriptionSearchTerm.trim() === '') {
      this.filteredInscriptions = [...this.inscriptions];
    } else {
      this.filteredInscriptions = this.inscriptions.filter(inscription => {
        const formation = this.getFormationById(inscription.idFormation);
        const etudiant = this.getEtudiantById(inscription.idEtudiant);
        return formation?.intitule.toLowerCase().includes(this.inscriptionSearchTerm.toLowerCase()) ||
               etudiant?.nom.toLowerCase().includes(this.inscriptionSearchTerm.toLowerCase()) ||
               etudiant?.prenom.toLowerCase().includes(this.inscriptionSearchTerm.toLowerCase());
      });
    }
  }

  // Changer le statut d'une inscription (paye/non paye)
  toggleInscriptionStatut(inscription: Inscription) {
    const nouveauStatut = inscription.statut === 'paye' ? 'non paye' : 'paye';
    this.databaseService.updateInscription(inscription.idInscription, { statut: nouveauStatut });
    this.loadData();
    const etudiant = this.getEtudiantById(inscription.idEtudiant);
    const formation = this.getFormationById(inscription.idFormation);
    this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" marquée comme ${nouveauStatut === 'paye' ? 'payée' : 'non payée'}`, 'success');
  }

  // Supprimer une inscription
  deleteInscription(inscription: Inscription) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette inscription ?')) {
      this.databaseService.deleteInscription(inscription.idInscription);
      this.loadData();
      const etudiant = this.getEtudiantById(inscription.idEtudiant);
      const formation = this.getFormationById(inscription.idFormation);
      this.showMessage(`Inscription de ${etudiant?.prenom} ${etudiant?.nom} à "${formation?.intitule}" supprimée`, 'success');
    }
  }

  // Supprimer une formation
  deleteFormation(formation: FormationDetail) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?`)) {
      this.databaseService.deleteFormation(formation.idFormation);
      this.loadData();
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

  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 10}`;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}
