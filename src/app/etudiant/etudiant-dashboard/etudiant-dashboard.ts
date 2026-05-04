import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur } from '../../services/database.service';
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
  searchTerm: string = '';
  message: string = '';
  messageType: 'success' | 'error' = 'success';
  isLoading: boolean = true;

  // Pour le modal de détails
  selectedFormation: FormationDetail | null = null;
  showDetailModal: boolean = false;

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
      this.loadProfileData();
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

  // Charger les données du profil pour le formulaire
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
    if (!this.etudiantInfo) return;

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
      prenom: this.profileForm.prenom,
      mail: this.profileForm.mail,
      tel: this.profileForm.tel,
      niveau: this.profileForm.niveau
    };

    // Ajouter le mot de passe seulement s'il a été modifié
    if (this.profileForm.password) {
      updateData.motpass = this.profileForm.password;
    }

    // Mettre à jour dans la base de données
    this.databaseService.updateEtudiant(this.etudiantInfo.idEtudiant, updateData);

    // Mettre à jour l'objet local
    this.etudiantInfo = {
      ...this.etudiantInfo,
      nom: this.profileForm.nom,
      prenom: this.profileForm.prenom,
      mail: this.profileForm.mail,
      tel: this.profileForm.tel,
      niveau: this.profileForm.niveau
    };

    // Mettre à jour le mot de passe local si modifié
    if (this.profileForm.password) {
      this.etudiantInfo.motpass = this.profileForm.password;
    }

    // Mettre à jour currentUser si nécessaire
    if (this.currentUser) {
      this.currentUser.firstName = this.profileForm.prenom;
      this.currentUser.lastName = this.profileForm.nom;
      this.currentUser.email = this.profileForm.mail;
      this.currentUser.phone = this.profileForm.tel;
      this.currentUser.level = this.profileForm.niveau as any;
      if (this.profileForm.password) {
        this.currentUser.password = this.profileForm.password;
      }

      // Sauvegarder dans le storage
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    this.showMessage('Profil mis à jour avec succès', 'success');
    this.closeProfileModal();
  }

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

  // Méthodes pour les statistiques
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
