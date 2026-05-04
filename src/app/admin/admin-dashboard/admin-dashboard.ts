import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur, Admin, Database } from '../../services/database.service';
import { User } from '../../model/user.model';

// Interface pour le regroupement par formation
interface FormationInscriptionGroup {
  formationId: number;
  formationName: string;
  inscriptions: Inscription[];
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  standalone: true
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

  // Recherche Formations
  searchFormationTerm: string = '';
  filteredFormations: FormationDetail[] = [];
  selectedStatut: string = 'all';

  // Formation sélectionnée pour le modal
  selectedFormationDetail: FormationDetail | null = null;
  showFormationModal: boolean = false;

  // Recherche Inscriptions
  searchInscriptionTerm: string = '';
  filteredInscriptions: Inscription[] = [];
  selectedPaiementStatut: string = 'all';

  // Recherche Étudiants
  searchEtudiantTerm: string = '';
  filteredEtudiants: Etudiant[] = [];
  selectedEtudiantStatut: string = 'all';

  // Étudiant sélectionné pour le modal
  selectedEtudiant: Etudiant | null = null;
  showEtudiantModal: boolean = false;

  // Recherche Formateurs
  searchFormateurTerm: string = '';
  filteredFormateurs: Formateur[] = [];
  selectedFormateurStatut: string = 'all';

  // Formateur sélectionné pour le modal
  selectedFormateur: Formateur | null = null;
  showFormateurModal: boolean = false;

  // Paramètres
  selectedDevise: string = '€';
  devises: string[] = ['€', '$', '£', 'DA', 'CFA', 'CHF', 'CAD'];
  pourcentageBenefice: number = 50;
  showParamModal: boolean = false;

  // Formulaire de modification du profil
  showProfileModal: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordError: string = '';
  profileForm: ProfileForm = {
    nom: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

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
    revenuTotal: 0,
    beneficeTotal: 0
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
    this.loadParametres();
    this.currentUser = this.auth.getCurrentUser();

    if (this.currentUser) {
      this.adminInfo = this.databaseService.getAdminById(this.currentUser.id) || null;
      this.loadProfileData();
    }

    this.dbSubscription = this.databaseService.getDatabase$().subscribe({
      next: (database: Database | null) => {
        if (database) {
          console.log('AdminDashboard: Données reçues de Firebase', database);
          this.loadDataFromDatabase(database);
          this.isLoading = false;
        } else {
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

    this.applyFormationFilters();
    this.applyInscriptionFilters();
    this.applyEtudiantFilters();
    this.applyFormateurFilters();

    this.updateStats();
  }

  updateStats() {
    const revenuTotal = this.inscriptions
      .filter(i => i.statut === 'paye')
      .reduce((sum, i) => {
        const formation = this.formations.find(f => f.idFormation === i.idFormation);
        return sum + (formation?.prix || 0);
      }, 0);

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
      revenuTotal: revenuTotal,
      beneficeTotal: revenuTotal * this.pourcentageBenefice / 100
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

  // ==================== GESTION DU PROFIL ADMIN ====================

  // Charger les données du profil pour le formulaire
  loadProfileData() {
    if (this.adminInfo) {
      this.profileForm = {
        nom: this.adminInfo.nom,
        email: this.adminInfo.email,
        password: '',
        confirmPassword: ''
      };
    } else if (this.currentUser) {
      this.profileForm = {
        nom: `${this.currentUser.firstName} ${this.currentUser.lastName}`,
        email: this.currentUser.email,
        password: '',
        confirmPassword: ''
      };
    }
    this.passwordError = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  // Ouvrir le modal de modification du profil
  openProfileModal() {
    this.loadProfileData();
    this.showProfileModal = true;
  }

  // Fermer le modal de modification du profil
  closeProfileModal() {
    this.showProfileModal = false;
    this.passwordError = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  // Basculer la visibilité du mot de passe
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Basculer la visibilité de la confirmation du mot de passe
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Sauvegarder les modifications du profil
  saveProfile() {
    if (!this.adminInfo && !this.currentUser) return;

    // Vérifier les mots de passe si un nouveau mot de passe est saisi
    if (this.profileForm.password) {
      if (this.profileForm.password.length < 6) {
        this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères';
        return;
      }
      if (this.profileForm.password !== this.profileForm.confirmPassword) {
        this.passwordError = 'Les mots de passe ne correspondent pas';
        return;
      }
    }

    this.passwordError = '';

    // Préparer les données de mise à jour
    const updateData: any = {
      nom: this.profileForm.nom,
      email: this.profileForm.email
    };

    // Ajouter le mot de passe seulement s'il a été modifié
    if (this.profileForm.password) {
      updateData.motpass = this.profileForm.password;
    }

    // Mettre à jour dans la base de données
    if (this.adminInfo) {
      this.databaseService.updateAdmin(this.adminInfo.id, updateData);

      // Mettre à jour l'objet local
      this.adminInfo = {
        ...this.adminInfo,
        nom: this.profileForm.nom,
        email: this.profileForm.email
      };

      if (this.profileForm.password) {
        this.adminInfo.motpass = this.profileForm.password;
      }
    }

    // Mettre à jour currentUser
    if (this.currentUser) {
      const nameParts = this.profileForm.nom.split(' ');
      this.currentUser.firstName = nameParts[0] || '';
      this.currentUser.lastName = nameParts.slice(1).join(' ') || '';
      this.currentUser.email = this.profileForm.email;
      if (this.profileForm.password) {
        this.currentUser.password = this.profileForm.password;
      }

      // Sauvegarder dans le storage
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    this.showMessage('Profil mis à jour avec succès', 'success');
    this.closeProfileModal();
  }

  // ==================== PARAMÈTRES ====================

  openParamModal() {
    this.showParamModal = true;
  }

  closeParamModal() {
    this.showParamModal = false;
  }

  saveParametres() {
    localStorage.setItem('selectedDevise', this.selectedDevise);
    localStorage.setItem('pourcentageBenefice', this.pourcentageBenefice.toString());
    this.updateStats();
    this.showMessage('Paramètres sauvegardés avec succès', 'success');
    this.closeParamModal();
  }

  loadParametres() {
    const savedDevise = localStorage.getItem('selectedDevise');
    const savedPourcentage = localStorage.getItem('pourcentageBenefice');
    if (savedDevise) this.selectedDevise = savedDevise;
    if (savedPourcentage) this.pourcentageBenefice = parseFloat(savedPourcentage);
  }

  formatPrice(prix: number): string {
    const symboles: { [key: string]: string } = {
      '€': '€',
      '$': '$',
      '£': '£',
      'DA': 'DA',
      'CFA': 'CFA',
      'CHF': 'CHF',
      'CAD': 'CAD'
    };
    const symbole = symboles[this.selectedDevise] || this.selectedDevise;

    if (this.selectedDevise === 'DA') {
      return `${prix} ${symbole}`;
    }
    return `${symbole}${prix}`;
  }

  // ==================== RECHERCHE FORMATIONS ====================
  onSearchFormation() {
    this.applyFormationFilters();
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  applyFormationFilters() {
    let filtered = [...this.formations];

    if (this.searchFormationTerm && this.searchFormationTerm.trim() !== '') {
      const searchTermLower = this.searchFormationTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(formation => {
        const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);
        const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);
        const programmeMatch = formation.programme.some(point => point.toLowerCase().includes(searchTermLower));
        const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);
        const prixString = formation.prix.toString();
        const prixMatch = prixString.includes(searchTermLower) || `${formation.prix} €`.toLowerCase().includes(searchTermLower);

        const formateur = this.getFormateurById(formation.idFormateur);
        let formateurMatch = false;
        if (formateur) {
          formateurMatch = formateur.nom.toLowerCase().includes(searchTermLower) ||
            formateur.prenom.toLowerCase().includes(searchTermLower) ||
            formateur.specialite.toLowerCase().includes(searchTermLower);
        }

        let multiWordMatch = false;
        if (searchWords.length > 1) {
          multiWordMatch = searchWords.every(word =>
            formation.intitule.toLowerCase().includes(word) ||
            formation.description.toLowerCase().includes(word) ||
            formation.programme.some(p => p.toLowerCase().includes(word))
          );
        }

        return intituleMatch || descriptionMatch || programmeMatch || dureeMatch || prixMatch || formateurMatch || multiWordMatch;
      });
    }

    if (this.selectedStatut !== 'all') {
      filtered = filtered.filter(formation => formation.statut === this.selectedStatut);
    }

    this.filteredFormations = filtered;
  }

  highlightFormationText(text: string): string {
    if (!this.searchFormationTerm || this.searchFormationTerm.trim() === '') {
      return text;
    }
    return this.highlightText(text, this.searchFormationTerm);
  }

  // ==================== MÉTHODES POUR LES CARTES FORMATIONS ====================

  getInscriptionsByFormationId(idFormation: number): Inscription[] {
    return this.inscriptions.filter(i => i.idFormation === idFormation);
  }

  // ==================== RECHERCHE INSCRIPTIONS ====================
  onSearchInscription() {
    this.applyInscriptionFilters();
  }

  onPaiementStatutChange() {
    this.applyInscriptionFilters();
  }

  applyInscriptionFilters() {
    let filtered = [...this.inscriptions];

    if (this.searchInscriptionTerm && this.searchInscriptionTerm.trim() !== '') {
      const searchTermLower = this.searchInscriptionTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(inscription => {
        const etudiant = this.getEtudiantById(inscription.idEtudiant);
        const formation = this.getFormationById(inscription.idFormation);

        const etudiantMatch = etudiant ?
          (etudiant.nom.toLowerCase().includes(searchTermLower) ||
            etudiant.prenom.toLowerCase().includes(searchTermLower) ||
            etudiant.mail.toLowerCase().includes(searchTermLower)) : false;

        const formationMatch = formation ?
          formation.intitule.toLowerCase().includes(searchTermLower) : false;

        const dateMatch = inscription.dateInscription.toLowerCase().includes(searchTermLower);
        const statutMatch = inscription.statut.toLowerCase().includes(searchTermLower);

        let multiWordMatch = false;
        if (searchWords.length > 1 && etudiant) {
          multiWordMatch = searchWords.every(word =>
            etudiant.nom.toLowerCase().includes(word) ||
            etudiant.prenom.toLowerCase().includes(word) ||
            (formation && formation.intitule.toLowerCase().includes(word))
          );
        }

        return etudiantMatch || formationMatch || dateMatch || statutMatch || multiWordMatch;
      });
    }

    if (this.selectedPaiementStatut !== 'all') {
      filtered = filtered.filter(inscription => inscription.statut === this.selectedPaiementStatut);
    }

    this.filteredInscriptions = filtered;
  }

  highlightInscriptionText(text: string): string {
    if (!this.searchInscriptionTerm || this.searchInscriptionTerm.trim() === '') {
      return text;
    }
    return this.highlightText(text, this.searchInscriptionTerm);
  }

  // ==================== RECHERCHE ÉTUDIANTS ====================
  onSearchEtudiant() {
    this.applyEtudiantFilters();
  }

  onEtudiantStatutChange() {
    this.applyEtudiantFilters();
  }

  applyEtudiantFilters() {
    let filtered = [...this.etudiants];

    if (this.searchEtudiantTerm && this.searchEtudiantTerm.trim() !== '') {
      const searchTermLower = this.searchEtudiantTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(etudiant => {
        const nomMatch = etudiant.nom.toLowerCase().includes(searchTermLower);
        const prenomMatch = etudiant.prenom.toLowerCase().includes(searchTermLower);
        const emailMatch = etudiant.mail.toLowerCase().includes(searchTermLower);
        const telMatch = etudiant.tel.toLowerCase().includes(searchTermLower);
        const niveauMatch = etudiant.niveau.toLowerCase().includes(searchTermLower);
        const statutMatch = etudiant.statut.toLowerCase().includes(searchTermLower);

        let multiWordMatch = false;
        if (searchWords.length > 1) {
          multiWordMatch = searchWords.every(word =>
            etudiant.nom.toLowerCase().includes(word) ||
            etudiant.prenom.toLowerCase().includes(word) ||
            etudiant.mail.toLowerCase().includes(word)
          );
        }

        return nomMatch || prenomMatch || emailMatch || telMatch || niveauMatch || statutMatch || multiWordMatch;
      });
    }

    if (this.selectedEtudiantStatut !== 'all') {
      filtered = filtered.filter(etudiant => etudiant.statut === this.selectedEtudiantStatut);
    }

    this.filteredEtudiants = filtered;
  }

  highlightEtudiantText(text: string): string {
    if (!this.searchEtudiantTerm || this.searchEtudiantTerm.trim() === '') {
      return text;
    }
    return this.highlightText(text, this.searchEtudiantTerm);
  }

  // ==================== MÉTHODES POUR LES CARTES ÉTUDIANTS ====================

  getInscriptionsByEtudiant(idEtudiant: number): Inscription[] {
    return this.inscriptions.filter(i => i.idEtudiant === idEtudiant);
  }

  // ==================== RECHERCHE FORMATEURS ====================
  onSearchFormateur() {
    this.applyFormateurFilters();
  }

  onFormateurStatutChange() {
    this.applyFormateurFilters();
  }

  applyFormateurFilters() {
    let filtered = [...this.formateurs];

    if (this.searchFormateurTerm && this.searchFormateurTerm.trim() !== '') {
      const searchTermLower = this.searchFormateurTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(formateur => {
        const nomMatch = formateur.nom.toLowerCase().includes(searchTermLower);
        const prenomMatch = formateur.prenom.toLowerCase().includes(searchTermLower);
        const emailMatch = formateur.mail.toLowerCase().includes(searchTermLower);
        const telMatch = formateur.tel.toLowerCase().includes(searchTermLower);
        const specialiteMatch = formateur.specialite.toLowerCase().includes(searchTermLower);
        const niveauMatch = formateur.niveau.toLowerCase().includes(searchTermLower);
        const statutMatch = formateur.statut.toLowerCase().includes(searchTermLower);

        let multiWordMatch = false;
        if (searchWords.length > 1) {
          multiWordMatch = searchWords.every(word =>
            formateur.nom.toLowerCase().includes(word) ||
            formateur.prenom.toLowerCase().includes(word) ||
            formateur.specialite.toLowerCase().includes(word)
          );
        }

        return nomMatch || prenomMatch || emailMatch || telMatch || specialiteMatch || niveauMatch || statutMatch || multiWordMatch;
      });
    }

    if (this.selectedFormateurStatut !== 'all') {
      filtered = filtered.filter(formateur => formateur.statut === this.selectedFormateurStatut);
    }

    this.filteredFormateurs = filtered;
  }

  highlightFormateurText(text: string): string {
    if (!this.searchFormateurTerm || this.searchFormateurTerm.trim() === '') {
      return text;
    }
    return this.highlightText(text, this.searchFormateurTerm);
  }

  // ==================== MÉTHODES POUR LES CARTES FORMATEURS ====================

  getFormationsByFormateur(idFormateur: number): FormationDetail[] {
    return this.formations.filter(f => f.idFormateur === idFormateur);
  }

  // ==================== UTILITAIRE DE SURBRILLANCE ====================

  private highlightText(text: string, searchTerm: string): string {
    if (!searchTerm || searchTerm.trim() === '') {
      return text;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
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

  // ==================== ACTIONS CRUD ====================
  toggleFormationStatut(formation: FormationDetail | null) {
    if (!formation) return;
    const nouveauStatut = formation.statut === 'valide' ? 'nonValide' : 'valide';
    this.databaseService.updateFormation(formation.idFormation, { statut: nouveauStatut });
    formation.statut = nouveauStatut;
    this.updateStats();
    this.applyFormationFilters();
    this.showMessage(`Formation "${formation.intitule}" ${nouveauStatut === 'valide' ? 'validée' : 'invalidée'}`, 'success');
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

  confirmDeleteFormation(formation: FormationDetail | null) {
    if (!formation) return;
    const inscriptionsLiees = this.inscriptions.filter(i => i.idFormation === formation.idFormation);
    let message = `Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?\n\n`;
    if (inscriptionsLiees.length > 0) {
      message += `⚠️ Attention : Cette formation a ${inscriptionsLiees.length} inscription(s) liée(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;
    if (confirm(message)) {
      inscriptionsLiees.forEach(ins => this.databaseService.deleteInscription(ins.idInscription));
      this.databaseService.deleteFormation(formation.idFormation);
      this.formations = this.formations.filter(f => f.idFormation !== formation.idFormation);
      this.inscriptions = this.inscriptions.filter(i => i.idFormation !== formation.idFormation);
      this.applyFormationFilters();
      this.applyInscriptionFilters();
      this.updateStats();
      this.showFormationModal = false;
      this.showMessage(`Formation "${formation.intitule}" supprimée`, 'success');
    }
  }

  confirmDeleteInscription(inscription: Inscription) {
    const etudiant = this.getEtudiantById(inscription.idEtudiant);
    const formation = this.getFormationById(inscription.idFormation);
    const message = `Êtes-vous sûr de vouloir supprimer l'inscription de "${etudiant?.prenom} ${etudiant?.nom}" à la formation "${formation?.intitule}" ?\n\nCette action est irréversible.`;
    if (confirm(message)) {
      this.databaseService.deleteInscription(inscription.idInscription);
      this.inscriptions = this.inscriptions.filter(i => i.idInscription !== inscription.idInscription);
      this.applyInscriptionFilters();
      this.updateStats();
      this.showMessage(`Inscription supprimée`, 'success');
    }
  }

  confirmDeleteEtudiant(etudiant: Etudiant | null) {
    if (!etudiant) return;
    const inscriptionsEtudiant = this.inscriptions.filter(i => i.idEtudiant === etudiant.idEtudiant);
    let message = `Êtes-vous sûr de vouloir supprimer l'étudiant "${etudiant.prenom} ${etudiant.nom}" ?\n\n`;
    if (inscriptionsEtudiant.length > 0) {
      message += `⚠️ Attention : Cet étudiant a ${inscriptionsEtudiant.length} inscription(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;
    if (confirm(message)) {
      inscriptionsEtudiant.forEach(ins => this.databaseService.deleteInscription(ins.idInscription));
      this.databaseService.deleteEtudiant(etudiant.idEtudiant);
      this.etudiants = this.etudiants.filter(e => e.idEtudiant !== etudiant.idEtudiant);
      this.inscriptions = this.inscriptions.filter(i => i.idEtudiant !== etudiant.idEtudiant);
      this.applyEtudiantFilters();
      this.applyInscriptionFilters();
      this.updateStats();
      this.showEtudiantModal = false;
      this.showMessage(`Étudiant "${etudiant.prenom} ${etudiant.nom}" supprimé`, 'success');
    }
  }

  confirmDeleteFormateur(formateur: Formateur | null) {
    if (!formateur) return;
    const formationsFormateur = this.formations.filter(f => f.idFormateur === formateur.idFormateur);
    let message = `Êtes-vous sûr de vouloir supprimer le formateur "${formateur.prenom} ${formateur.nom}" ?\n\n`;
    if (formationsFormateur.length > 0) {
      message += `⚠️ Attention : Ce formateur a ${formationsFormateur.length} formation(s).\n`;
      message += `Ces formations et leurs inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;
    if (confirm(message)) {
      formationsFormateur.forEach(formation => {
        const inscriptionsFormation = this.inscriptions.filter(i => i.idFormation === formation.idFormation);
        inscriptionsFormation.forEach(ins => this.databaseService.deleteInscription(ins.idInscription));
        this.databaseService.deleteFormation(formation.idFormation);
      });
      this.databaseService.deleteFormateur(formateur.idFormateur);
      this.formateurs = this.formateurs.filter(f => f.idFormateur !== formateur.idFormateur);
      this.formations = this.formations.filter(f => f.idFormateur !== formateur.idFormateur);
      this.inscriptions = this.inscriptions.filter(i => {
        const formation = this.formations.find(f => f.idFormation === i.idFormation);
        return formation !== undefined;
      });
      this.applyFormationFilters();
      this.applyInscriptionFilters();
      this.applyFormateurFilters();
      this.updateStats();
      this.showFormateurModal = false;
      this.showMessage(`Formateur "${formateur.prenom} ${formateur.nom}" supprimé`, 'success');
    }
  }

  // ==================== REGROUPEMENT PAR FORMATION POUR INSCRIPTIONS ====================

  getInscriptionsByFormation(): FormationInscriptionGroup[] {
    const groups: { [key: number]: FormationInscriptionGroup } = {};

    this.filteredInscriptions.forEach(inscription => {
      const formation = this.getFormationById(inscription.idFormation);
      if (formation) {
        if (!groups[formation.idFormation]) {
          groups[formation.idFormation] = {
            formationId: formation.idFormation,
            formationName: formation.intitule,
            inscriptions: []
          };
        }
        groups[formation.idFormation].inscriptions.push(inscription);
      }
    });

    return Object.values(groups).sort((a, b) =>
      a.formationName.localeCompare(b.formationName)
    );
  }

  getUniqueFormationsCount(): number {
    const uniqueFormations = new Set(this.filteredInscriptions.map(i => i.idFormation));
    return uniqueFormations.size;
  }

  getFormationPayeCount(inscriptions: Inscription[]): number {
    return inscriptions.filter(i => i.statut === 'paye').length;
  }

  getFormationNonPayeCount(inscriptions: Inscription[]): number {
    return inscriptions.filter(i => i.statut === 'non paye').length;
  }

  // ==================== MÉTHODES POUR LES REVENUS ET BÉNÉFICES ====================

  getFormationRevenus(inscriptions: Inscription[]): number {
    let total = 0;
    inscriptions.forEach(inscription => {
      if (inscription.statut === 'paye') {
        const formation = this.getFormationById(inscription.idFormation);
        if (formation) {
          total += formation.prix;
        }
      }
    });
    return total;
  }

  getFormationBenefice(inscriptions: Inscription[]): number {
    const revenus = this.getFormationRevenus(inscriptions);
    return revenus * this.pourcentageBenefice / 100;
  }

  // ==================== HELPER METHODS ====================
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

  getPayeCount(): number {
    return this.filteredInscriptions.filter(i => i.statut === 'paye').length;
  }

  getNonPayeCount(): number {
    return this.filteredInscriptions.filter(i => i.statut === 'non paye').length;
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

interface ProfileForm {
  nom: string;
  email: string;
  password: string;
  confirmPassword: string;
}
