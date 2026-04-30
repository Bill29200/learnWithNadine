import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/auth';
import { DatabaseService, Etudiant, Formateur, FormationDetail, Inscription } from '../../services/database.service';

@Component({
  selector: 'app-formateur-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './formateur-dashboard.html',
  styleUrl: './formateur-dashboard.css',
})
export class FormateurDashboard implements OnInit {
  currentUser: User | null = null;
  formateurInfo: Formateur | null = null;

  // Formations du formateur
  mesFormations: FormationDetail[] = [];
  filteredFormations: FormationDetail[] = [];
  searchTerm: string = '';
  selectedStatut: string = 'all';

  // Formation sélectionnée pour voir les étudiants
  selectedFormation: FormationDetail | null = null;
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

  // Onglet actif
  activeTab: string = 'formations';

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

    // S'abonner aux changements de la base de données
    this.databaseService.getDatabase$().subscribe(() => {
      this.loadMesFormations();
    });
  }

  loadMesFormations() {
    // Récupérer uniquement les formations de ce formateur
    const allFormations = this.databaseService.getFormations();
    this.mesFormations = allFormations.filter(f => f.idFormateur === this.currentUser?.id);
    this.applyFormationFilters();
    this.isLoading = false;
  }

  applyFormationFilters() {
    let filtered = [...this.mesFormations];

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

  onSearchFormations() {
    this.applyFormationFilters();
  }

  onStatutChange() {
    this.applyFormationFilters();
  }

  // Voir les étudiants inscrits à une formation
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

    this.activeTab = 'etudiants';
  }

  // Fermer la vue des étudiants
  closeEtudiantsView() {
    this.selectedFormation = null;
    this.etudiantsInscrits = [];
    this.activeTab = 'formations';
  }

  // ============ CRUD FORMATIONS ============

  // Ouvrir formulaire d'ajout
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

  // Ouvrir formulaire de modification
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

  // Fermer le modal
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

  // Ajouter un point au programme
  addProgrammePoint() {
    if (this.programmeInput.trim()) {
      this.formationForm.programme.push(this.programmeInput.trim());
      this.programmeInput = '';
    }
  }

  // Supprimer un point du programme
  removeProgrammePoint(index: number) {
    this.formationForm.programme.splice(index, 1);
  }

  // Sauvegarder la formation
  saveFormation() {
    if (!this.formationForm.intitule || !this.formationForm.description) {
      this.showMessage('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (this.isEditing) {
      // Mise à jour
      this.databaseService.updateFormation(this.formationForm.idFormation, {
        intitule: this.formationForm.intitule,
        duree: this.formationForm.duree,
        prix: this.formationForm.prix,
        description: this.formationForm.description,
        programme: this.formationForm.programme
      });
      this.showMessage('Formation modifiée avec succès', 'success');
    } else {
      // Création
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

  // Supprimer une formation (avec confirmation)
  confirmDeleteFormation(formation: FormationDetail) {
    const inscriptionsLiees = this.databaseService.getInscriptionsByFormation(formation.idFormation);
    let message = `Êtes-vous sûr de vouloir supprimer la formation "${formation.intitule}" ?\n\n`;

    if (inscriptionsLiees.length > 0) {
      message += `⚠️ Attention : Cette formation a ${inscriptionsLiees.length} inscription(s) liée(s).\n`;
      message += `Ces inscriptions seront également supprimées.\n\n`;
    }
    message += `Cette action est irréversible.`;

    if (confirm(message)) {
      // Supprimer les inscriptions liées
      inscriptionsLiees.forEach(ins => {
        this.databaseService.deleteInscription(ins.idInscription);
      });
      // Supprimer la formation
      this.databaseService.deleteFormation(formation.idFormation);
      this.loadMesFormations();
      this.showMessage(`Formation "${formation.intitule}" supprimée`, 'success');
    }
  }

  // Changer le statut d'une formation (si déjà créée, peut être modifié)
  // Note: Seul l'admin peut changer le statut, mais le formateur peut voir le statut

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
    return 'Formateur';
  }

  getInitials(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`;
    }
    return 'F';
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  getCardHeaderClass(index: number): string {
    return `card-header-color-${index % 10}`;
  }
  // Compter le nombre d'inscrits pour une formation
getNombreInscrits(formationId: number): number {
  return this.databaseService.getInscriptionsByFormation(formationId).length;
}

// Récupérer les formations validées
getFormationsValides(): FormationDetail[] {
  return this.mesFormations.filter(f => f.statut === 'valide');
}

// Récupérer les formations non validées
getFormationsNonValides(): FormationDetail[] {
  return this.mesFormations.filter(f => f.statut === 'nonValide');
}

// Récupérer le total des inscriptions (uniquement pour les formations validées)
getTotalInscriptions(): number {
  let total = 0;
  this.mesFormations.forEach(formation => {
    if (formation.statut === 'valide') {
      total += this.databaseService.getInscriptionsByFormation(formation.idFormation).length;
    }
  });
  return total;
}

// Récupérer les revenus totaux (basés sur les inscriptions payées des formations validées)
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
