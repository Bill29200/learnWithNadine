import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur, DemandeFormation } from '../../services/database.service';
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
  mesDemandes: DemandeFormation[] = [];
  searchTerm: string = '';
  message: string = '';
  messageType: 'success' | 'error' = 'success';
  isLoading: boolean = true;

  // Pour le modal de détails
  selectedFormation: FormationDetail | null = null;
  showDetailModal: boolean = false;

  // Formulaire de demande de formation
  showDemandeModal: boolean = false;
  demandeForm: DemandeFormData = {
    intitule: '',
    description: ''
  };

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
    niveau: '',
    password: '',
    confirmPassword: ''
  };

  // Niveaux disponibles pour les étudiants
  niveauxDisponibles: string[] = ['bac+1', 'bac+2', 'bac+3', 'bac+4', 'bac+5', 'bac+6', 'bac+7', 'bac+8'];

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
      this.loadMesDemandes();
      this.loadProfileData();
    }

    this.databaseService.getDatabase$().subscribe(() => {
      this.loadData();
      this.loadMesDemandes();
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

  // Charger les demandes de l'étudiant
  loadMesDemandes() {
    if (this.currentUser) {
      this.mesDemandes = this.databaseService.getDemandesByEtudiant(this.currentUser.id);
    }
  }

  // ==================== GESTION DES DEMANDES DE FORMATION ====================

  // Ouvrir le modal de demande
  openDemandeModal() {
    this.demandeForm = { intitule: '', description: '' };
    this.showDemandeModal = true;
  }

  // Fermer le modal de demande
  closeDemandeModal() {
    this.showDemandeModal = false;
    this.demandeForm = { intitule: '', description: '' };
  }

  // Soumettre une demande de formation
  soumettreDemande() {
    if (!this.demandeForm.intitule.trim() || !this.demandeForm.description.trim()) {
      this.showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    const nouvelleDemande: Omit<DemandeFormation, 'idDemande'> = {
      intitule: this.demandeForm.intitule,
      description: this.demandeForm.description,
      idEtudiant: this.currentUser!.id,
      dateDemande: new Date().toISOString().split('T')[0],
      statut: 'en_attente'
    };

    this.databaseService.addDemandeFormation(nouvelleDemande);
    this.showMessage('Votre demande de formation a été envoyée avec succès !', 'success');
    this.closeDemandeModal();
    this.loadMesDemandes();
  }

  // Obtenir le libellé du statut d'une demande
  getStatutDemandeLabel(statut: string): string {
    switch(statut) {
      case 'en_attente': return 'En attente';
      case 'acceptee_par_formateur': return 'Acceptée par formateur';
      case 'validee_par_admin': return 'Validée par admin';
      case 'refusee': return 'Refusée';
      default: return 'Inconnu';
    }
  }

  // Obtenir la classe CSS pour le badge de statut
  getStatutDemandeClass(statut: string): string {
    switch(statut) {
      case 'en_attente': return 'bg-warning text-dark';
      case 'acceptee_par_formateur': return 'bg-info text-white';
      case 'validee_par_admin': return 'bg-success text-white';
      case 'refusee': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  }

  // Obtenir l'icône pour le statut
  getStatutDemandeIcon(statut: string): string {
    switch(statut) {
      case 'en_attente': return 'bi-clock';
      case 'acceptee_par_formateur': return 'bi-check-circle';
      case 'validee_par_admin': return 'bi-star-fill';
      case 'refusee': return 'bi-x-circle';
      default: return 'bi-question-circle';
    }
  }

  // ==================== GESTION DU PROFIL ====================

  loadProfileData() {
    if (this.etudiantInfo) {
      this.profileForm = {
        nom: this.etudiantInfo.nom,
        prenom: this.etudiantInfo.prenom,
        mail: this.etudiantInfo.mail,
        tel: this.etudiantInfo.tel,
        niveau: this.etudiantInfo.niveau,
        password: '',
        confirmPassword: ''
      };
    }
    this.passwordError = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  openProfileModal() {
    this.loadProfileData();
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
    this.passwordError = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  saveProfile() {
    if (!this.etudiantInfo) return;

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
      niveau: this.profileForm.niveau
    };

    if (this.profileForm.password) {
      updateData.motpass = this.profileForm.password;
    }

    this.databaseService.updateEtudiant(this.etudiantInfo.idEtudiant, updateData);

    this.etudiantInfo = {
      ...this.etudiantInfo,
      nom: this.profileForm.nom,
      prenom: this.profileForm.prenom,
      mail: this.profileForm.mail,
      tel: this.profileForm.tel,
      niveau: this.profileForm.niveau
    };

    if (this.profileForm.password) {
      this.etudiantInfo.motpass = this.profileForm.password;
    }

    if (this.currentUser) {
      this.currentUser.firstName = this.profileForm.prenom;
      this.currentUser.lastName = this.profileForm.nom;
      this.currentUser.email = this.profileForm.mail;
      this.currentUser.phone = this.profileForm.tel;
      this.currentUser.level = this.profileForm.niveau as any;
      if (this.profileForm.password) {
        this.currentUser.password = this.profileForm.password;
      }
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    this.showMessage('Profil mis à jour avec succès', 'success');
    this.closeProfileModal();
  }

  // ==================== RECHERCHE ET FILTRAGE ====================

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

  // ==================== GESTION DES INSCRIPTIONS ====================

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

  // ==================== MÉTHODES STATISTIQUES ====================

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

  // ==================== MÉTHODES UTILITAIRES ====================

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
}

interface ProfileForm {
  nom: string;
  prenom: string;
  mail: string;
  tel: string;
  niveau: string;
  password: string;
  confirmPassword: string;
}

interface DemandeFormData {
  intitule: string;
  description: string;
}
