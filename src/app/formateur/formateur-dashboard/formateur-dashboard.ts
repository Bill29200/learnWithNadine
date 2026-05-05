import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur, DemandeFormation } from '../../services/database.service';
import { User } from '../../model/user.model';

@Component({
  selector: 'app-formateur-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './formateur-dashboard.html',
  styleUrl: './formateur-dashboard.css',
  standalone: true
})
export class FormateurDashboard implements OnInit {
  currentUser: User | null = null;
  formateurInfo: Formateur | null = null;

  // Formations du formateur
  mesFormations: FormationDetail[] = [];
  filteredFormations: FormationDetail[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'all';

  // Demandes de formation
  demandesEnAttente: DemandeFormation[] = [];
  activeDemandeTab: string = 'mesFormations';

  // Formation sélectionnée pour voir les étudiants (modal)
  selectedFormation: FormationDetail | null = null;
  showFormationModal: boolean = false;
  etudiantsInscrits: { etudiant: Etudiant, inscription: Inscription }[] = [];

  // Formulaire de création/modification
  showFormModal: boolean = false;
  isEditing: boolean = false;
  formationForm: FormationForm = {
    idFormation: 0,
    intitule: '',
    duree: '',
    prix: 0,
    description: '',
    programme: [] as string[],
    statut: 'nonValide'
  };
  programmeInput: string = '';

  // Modal de complétion de formation (pour les demandes)
  showCompleterModal: boolean = false;
  selectedDemande: DemandeFormation | null = null;
  completionForm: CompletionForm = {
    duree: '',
    prix: 0,
    programme: [] as string[]
  };
  completionProgrammeInput: string = '';

  // Formulaire de modification du profil
  showProfileModal: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordError: string = '';
  profileForm: ProfileForm = {
    nom: '',
    prenom: '',
    mail: '',
    tel: '',
    specialite: '',
    niveau: '',
    password: '',
    confirmPassword: ''
  };

  // Message
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  // État de chargement
  isLoading: boolean = true;

  // Niveaux disponibles
  niveauxDisponibles: string[] = ['autre', 'licence', 'master', 'ingenieur', 'magister', 'doctorat'];

  constructor(
    private auth: AuthService,
    private router: Router,
    private databaseService: DatabaseService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    if (this.currentUser) {
      this.formateurInfo = this.databaseService.getFormateurById(this.currentUser.id) || null;
      this.loadMesFormations();
      this.loadDemandesEnAttente();
      this.loadProfileData();
    }

    this.databaseService.getDatabase$().subscribe(() => {
      this.loadMesFormations();
      this.loadDemandesEnAttente();
    });
  }

  loadMesFormations() {
    const allFormations = this.databaseService.getFormations();
    this.mesFormations = allFormations.filter(f => f.idFormateur === this.currentUser?.id);
    this.applyFormationFilters();
    this.isLoading = false;
  }

  // Charger les demandes en attente
  loadDemandesEnAttente() {
    this.demandesEnAttente = this.databaseService.getDemandesEnAttenteFormateur();
  }

  // Charger les données du profil pour le formulaire
  loadProfileData() {
    if (this.formateurInfo) {
      this.profileForm = {
        nom: this.formateurInfo.nom,
        prenom: this.formateurInfo.prenom,
        mail: this.formateurInfo.mail,
        tel: this.formateurInfo.tel,
        specialite: this.formateurInfo.specialite,
        niveau: this.formateurInfo.niveau,
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
    if (!this.formateurInfo) return;

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

    const updateData: any = {
      nom: this.profileForm.nom,
      prenom: this.profileForm.prenom,
      mail: this.profileForm.mail,
      tel: this.profileForm.tel,
      specialite: this.profileForm.specialite,
      niveau: this.profileForm.niveau
    };

    if (this.profileForm.password) {
      updateData.motpass = this.profileForm.password;
    }

    this.databaseService.updateFormateur(this.formateurInfo.idFormateur, updateData);

    this.formateurInfo = {
      ...this.formateurInfo,
      nom: this.profileForm.nom,
      prenom: this.profileForm.prenom,
      mail: this.profileForm.mail,
      tel: this.profileForm.tel,
      specialite: this.profileForm.specialite,
      niveau: this.profileForm.niveau
    };

    if (this.profileForm.password) {
      this.formateurInfo.motpass = this.profileForm.password;
    }

    if (this.currentUser) {
      this.currentUser.firstName = this.profileForm.prenom;
      this.currentUser.lastName = this.profileForm.nom;
      this.currentUser.email = this.profileForm.mail;
      this.currentUser.phone = this.profileForm.tel;
      this.currentUser.specialty = this.profileForm.specialite;
      this.currentUser.level = this.profileForm.niveau as any;
      if (this.profileForm.password) {
        this.currentUser.password = this.profileForm.password;
      }
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    this.showMessage('Profil mis à jour avec succès', 'success');
    this.closeProfileModal();
  }

  // ==================== GESTION DES DEMANDES DE FORMATION ====================

  // Changer d'onglet
  setActiveDemandeTab(tab: string) {
    this.activeDemandeTab = tab;
  }

  // Accepter une demande de formation
  accepterDemande(demande: DemandeFormation) {
    if (confirm(`Acceptez-vous de devenir formateur pour la formation "${demande.intitule}" ?`)) {
      this.databaseService.updateDemandeFormation(demande.idDemande, {
        statut: 'acceptee_par_formateur',
        idFormateurAccepteur: this.currentUser?.id
      });
      this.showMessage(`Vous avez accepté la formation "${demande.intitule}". Complétez-la maintenant !`, 'success');
      this.loadDemandesEnAttente();
      // Ouvrir le modal de complétion
      this.selectedDemande = demande;
      this.completionForm = { duree: '', prix: 0, programme: [] };
      this.completionProgrammeInput = '';
      this.showCompleterModal = true;
    }
  }

  // Refuser une demande de formation
  refuserDemande(demande: DemandeFormation) {
    if (confirm(`Refusez-vous la formation "${demande.intitule}" ?`)) {
      this.databaseService.updateDemandeFormation(demande.idDemande, { statut: 'refusee' });
      this.showMessage(`Demande refusée`, 'error');
      this.loadDemandesEnAttente();
    }
  }

  // Fermer le modal de complétion
  closeCompleterModal() {
    this.showCompleterModal = false;
    this.selectedDemande = null;
    this.completionForm = { duree: '', prix: 0, programme: [] };
    this.completionProgrammeInput = '';
  }

  // Ajouter un point au programme
  addCompletionProgrammePoint() {
    if (this.completionProgrammeInput.trim()) {
      this.completionForm.programme.push(this.completionProgrammeInput.trim());
      this.completionProgrammeInput = '';
    }
  }

  // Supprimer un point du programme
  removeCompletionProgrammePoint(index: number) {
    this.completionForm.programme.splice(index, 1);
  }

  // Sauvegarder la formation complétée
  saveFormationCompletee() {
    if (!this.selectedDemande) return;

    if (!this.completionForm.duree || this.completionForm.prix <= 0) {
      this.showMessage('Veuillez renseigner la durée et le prix', 'error');
      return;
    }

    // Créer la formation complète
    const nouvelleFormation: Omit<FormationDetail, 'idFormation'> = {
      idFormateur: this.currentUser!.id,
      intitule: this.selectedDemande.intitule,
      duree: this.completionForm.duree,
      prix: this.completionForm.prix,
      description: this.selectedDemande.description,
      programme: this.completionForm.programme,
      statut: 'nonValide' // En attente de validation admin
    };

    const formationCreee = this.databaseService.addFormation(nouvelleFormation);

    // Mettre à jour la demande avec l'ID de la formation créée
    this.databaseService.updateDemandeFormation(this.selectedDemande.idDemande, {
      formationFinaleId: formationCreee.idFormation
    });

    // Inscrire automatiquement l'étudiant qui a proposé
    const inscription: Omit<Inscription, 'idInscription'> = {
      idFormation: formationCreee.idFormation,
      idEtudiant: this.selectedDemande.idEtudiant,
      dateInscription: new Date().toISOString().split('T')[0],
      statut: 'non paye'
    };
    this.databaseService.addInscription(inscription);

    this.showMessage(`Formation "${this.selectedDemande.intitule}" créée avec succès ! En attente de validation admin.`, 'success');
    this.closeCompleterModal();
    this.loadMesFormations();
    this.loadDemandesEnAttente();
  }

  // Récupérer le nom d'un étudiant par son ID
  getEtudiantNom(idEtudiant: number): string {
    const etudiant = this.databaseService.getEtudiantById(idEtudiant);
    return etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'Inconnu';
  }

  // ==================== MÉTHODES DE RECHERCHE ====================
  onSearch() {
    this.applyFormationFilters();
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  applyFormationFilters() {
    let filtered = [...this.mesFormations];

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(formation => {
        const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);
        const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);
        const programmeMatch = formation.programme.some(point =>
          point.toLowerCase().includes(searchTermLower)
        );
        const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);
        const prixString = formation.prix.toString();
        const prixAvecEuro = `${formation.prix} €`;
        let prixMatch = prixString.includes(searchTermLower) ||
          prixAvecEuro.toLowerCase().includes(searchTermLower);

        if (!prixMatch && searchTermLower.includes('€')) {
          const prixSansEuro = searchTermLower.replace('€', '').trim();
          prixMatch = prixString.includes(prixSansEuro);
        }

        let multiWordMatch = false;
        if (searchWords.length > 1) {
          multiWordMatch = searchWords.every(word =>
            formation.intitule.toLowerCase().includes(word) ||
            formation.description.toLowerCase().includes(word) ||
            formation.programme.some(p => p.toLowerCase().includes(word))
          );
        }

        return intituleMatch || descriptionMatch || programmeMatch ||
          dureeMatch || prixMatch || multiWordMatch;
      });
    }

    if (this.selectedStatut !== 'all') {
      filtered = filtered.filter(formation => formation.statut === this.selectedStatut);
    }

    this.filteredFormations = filtered;
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

  // ==================== CRUD FORMATIONS ====================
  voirEtudiantsInscrits(formation: FormationDetail) {
    this.selectedFormation = formation;
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

    this.showFormationModal = true;
  }

  closeFormationModal() {
    this.showFormationModal = false;
    this.selectedFormation = null;
    this.etudiantsInscrits = [];
  }

  openAddFormation() {
    this.isEditing = false;
    this.formationForm = {
      idFormation: 0,
      intitule: '',
      duree: '',
      prix: 0,
      description: '',
      programme: [],
      statut: 'nonValide'
    };
    this.programmeInput = '';
    this.showFormModal = true;
  }

  openEditFormation(formation: FormationDetail) {
    this.isEditing = true;
    this.formationForm = {
      idFormation: formation.idFormation,
      intitule: formation.intitule,
      duree: formation.duree,
      prix: formation.prix,
      description: formation.description,
      programme: [...formation.programme],
      statut: formation.statut
    };
    this.programmeInput = '';
    this.showFormModal = true;
  }

  closeModal() {
    this.showFormModal = false;
    this.formationForm = {
      idFormation: 0,
      intitule: '',
      duree: '',
      prix: 0,
      description: '',
      programme: [],
      statut: 'nonValide'
    };
    this.programmeInput = '';
  }

  addProgrammePoint() {
    if (this.programmeInput.trim()) {
      this.formationForm.programme.push(this.programmeInput.trim());
      this.programmeInput = '';
    }
  }

  removeProgrammePoint(index: number) {
    this.formationForm.programme.splice(index, 1);
  }

  saveFormation() {
    if (!this.formationForm.intitule || !this.formationForm.description) {
      this.showMessage('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (this.isEditing) {
      this.databaseService.updateFormation(this.formationForm.idFormation, {
        intitule: this.formationForm.intitule,
        duree: this.formationForm.duree,
        prix: this.formationForm.prix,
        description: this.formationForm.description,
        programme: this.formationForm.programme
      });
      this.showMessage('Formation modifiée avec succès', 'success');
    } else {
      const newFormation: Omit<FormationDetail, 'idFormation'> = {
        idFormateur: this.currentUser!.id,
        intitule: this.formationForm.intitule,
        duree: this.formationForm.duree,
        prix: this.formationForm.prix,
        description: this.formationForm.description,
        programme: this.formationForm.programme,
        statut: 'nonValide'
      };
      this.databaseService.addFormation(newFormation);
      this.showMessage('Formation ajoutée avec succès', 'success');
    }

    this.closeModal();
    this.loadMesFormations();
  }

  confirmDeleteFormation(formation: FormationDetail) {
    const inscriptionsLiees = this.databaseService.getInscriptionsByFormation(formation.idFormation);
    let message = `Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?\n\n`;
    if (inscriptionsLiees.length > 0) {
      message += `⚠️ Attention : Cette formation a ${inscriptionsLiees.length} inscription(s) liée(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;
    if (confirm(message)) {
      inscriptionsLiees.forEach(ins => {
        this.databaseService.deleteInscription(ins.idInscription);
      });
      this.databaseService.deleteFormation(formation.idFormation);
      this.loadMesFormations();
      this.showMessage(`Formation "${formation.intitule}" supprimée`, 'success');
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  getFormationStatutBadgeClass(statut: string): string {
    return statut === 'valide' ? 'badge bg-success' : 'badge bg-warning text-dark';
  }

  getInscriptionStatutBadgeClass(statut: string): string {
    return statut === 'paye' ? 'badge bg-success' : 'badge bg-danger';
  }

  getNombreInscrits(formationId: number): number {
    return this.databaseService.getInscriptionsByFormation(formationId).length;
  }

  getFormationsValides(): FormationDetail[] {
    return this.mesFormations.filter(f => f.statut === 'valide');
  }

  getFormationsNonValides(): FormationDetail[] {
    return this.mesFormations.filter(f => f.statut === 'nonValide');
  }

  getTotalInscriptions(): number {
    let total = 0;
    this.mesFormations.forEach(formation => {
      if (formation.statut === 'valide') {
        total += this.databaseService.getInscriptionsByFormation(formation.idFormation).length;
      }
    });
    return total;
  }

  // ==================== CALCUL DES REVENUS ET BÉNÉFICES ====================
  getPourcentageCommission(): number {
    const pourcentage = localStorage.getItem('pourcentageBenefice');
    return pourcentage ? parseFloat(pourcentage) : 50;
  }

  getPourcentageFormateur(): number {
    return 100 - this.getPourcentageCommission();
  }

  getBeneficeFormateur(): string {
    let totalRevenus = 0;
    this.mesFormations.forEach(formation => {
      if (formation.statut === 'valide') {
        const inscriptions = this.databaseService.getInscriptionsByFormation(formation.idFormation);
        const inscriptionsPayees = inscriptions.filter(i => i.statut === 'paye');
        totalRevenus += inscriptionsPayees.length * formation.prix;
      }
    });
    const pourcentageFormateur = this.getPourcentageFormateur() / 100;
    const benefice = totalRevenus * pourcentageFormateur;
    return benefice.toFixed(2);
  }

  getBeneficeFormation(formationId: number): string {
    const formation = this.mesFormations.find(f => f.idFormation === formationId);
    if (!formation || formation.statut !== 'valide') return '0.00';

    const inscriptions = this.databaseService.getInscriptionsByFormation(formationId);
    const inscriptionsPayees = inscriptions.filter(i => i.statut === 'paye');
    const revenusFormation = inscriptionsPayees.length * formation.prix;
    const pourcentageFormateur = this.getPourcentageFormateur() / 100;
    const benefice = revenusFormation * pourcentageFormateur;
    return benefice.toFixed(2);
  }

  getRevenusTotaux(): string {
    let total = 0;
    this.mesFormations.forEach(formation => {
      if (formation.statut === 'valide') {
        const inscriptions = this.databaseService.getInscriptionsByFormation(formation.idFormation);
        const inscriptionsPayees = inscriptions.filter(i => i.statut === 'paye');
        total += inscriptionsPayees.length * formation.prix;
      }
    });
    return total.toFixed(2);
  }

  canDeleteFormation(formation: FormationDetail): boolean {
    return formation.statut !== 'valide';
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
    return 'Formateur';
  }

  getInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`;
    }
    return 'F';
  }

  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 16}`;
  }
}

interface FormationForm {
  idFormation: number;
  intitule: string;
  duree: string;
  prix: number;
  description: string;
  programme: string[];
  statut: 'valide' | 'nonValide';
}

interface ProfileForm {
  nom: string;
  prenom: string;
  mail: string;
  tel: string;
  specialite: string;
  niveau: string;
  password: string;
  confirmPassword: string;
}

interface CompletionForm {
  duree: string;
  prix: number;
  programme: string[];
}
