import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { DatabaseService, FormationDetail, Inscription, Etudiant, Formateur } from '../../services/database.service';
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

  // Message
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  // État de chargement
  isLoading: boolean = true;

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
    }

    this.databaseService.getDatabase$().subscribe(() => {
      this.loadMesFormations();
    });
  }

  loadMesFormations() {
    const allFormations = this.databaseService.getFormations();
    this.mesFormations = allFormations.filter(f => f.idFormateur === this.currentUser?.id);
    this.applyFormationFilters();
    this.isLoading = false;
  }

  // Méthode de recherche multi-critères
  onSearch() {
    this.applyFormationFilters();
  }

  applyFormationFilters() {
    let filtered = [...this.mesFormations];

    // Filtre par recherche multi-critères
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      const searchWords = searchTermLower.split(/\s+/);

      filtered = filtered.filter(formation => {
        // 1. Recherche dans l'intitulé
        const intituleMatch = formation.intitule.toLowerCase().includes(searchTermLower);

        // 2. Recherche dans la description
        const descriptionMatch = formation.description.toLowerCase().includes(searchTermLower);

        // 3. Recherche dans le programme
        const programmeMatch = formation.programme.some(point =>
          point.toLowerCase().includes(searchTermLower)
        );

        // 4. Recherche dans la durée
        const dureeMatch = formation.duree.toLowerCase().includes(searchTermLower);

        // 5. Recherche dans le prix
        const prixString = formation.prix.toString();
        const prixAvecEuro = `${formation.prix} €`;
        let prixMatch = prixString.includes(searchTermLower) ||
          prixAvecEuro.toLowerCase().includes(searchTermLower);

        if (!prixMatch && searchTermLower.includes('€')) {
          const prixSansEuro = searchTermLower.replace('€', '').trim();
          prixMatch = prixString.includes(prixSansEuro);
        }

        // 6. Recherche par mots-clés multiples
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

    // Filtre par statut
    if (this.selectedStatut !== 'all') {
      filtered = filtered.filter(formation => formation.statut === this.selectedStatut);
    }

    this.filteredFormations = filtered;
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  // Mise en évidence des termes recherchés
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

  // Voir les étudiants inscrits (ouvre modal)
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

  // CRUD Formations
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

  getRevenusTotaux(): number {
    let total = 0;
    this.mesFormations.forEach(formation => {
      if (formation.statut === 'valide') {
        const inscriptions = this.databaseService.getInscriptionsByFormation(formation.idFormation);
        const inscriptionsPayees = inscriptions.filter(i => i.statut === 'paye');
        total += inscriptionsPayees.length * formation.prix;
      }
    });
    return total;
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
    // Cycle à travers 16 couleurs différentes
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
