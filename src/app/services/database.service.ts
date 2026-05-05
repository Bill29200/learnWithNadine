import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { onValue, ref, set } from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { db } from '../config/firebase.config';

export interface Admin {
  id: number;
  nom: string;
  email: string;
  motpass: string;
}

export interface Formateur {
  idFormateur: number;
  nom: string;
  prenom: string;
  tel: string;
  mail: string;
  motpass: string;
  niveau: string;
  specialite: string;
  photo: string;
  statut: 'actif' | 'bloque';
}

export interface FormationDetail {
  idFormation: number;
  idFormateur: number;
  intitule: string;
  duree: string;
  prix: number;
  description: string;
  programme: string[];
  statut: 'valide' | 'nonValide';
}

export interface Etudiant {
  idEtudiant: number;
  nom: string;
  prenom: string;
  mail: string;
  tel: string;
  niveau: string;
  motpass: string;
  statut: 'actif' | 'bloque';
  photo: string;
}

export interface Inscription {
  idInscription: number;
  idFormation: number;
  idEtudiant: number;
  dateInscription: string;
  statut: 'paye' | 'non paye';
}

export interface DemandeFormation {
  idDemande: number;
  intitule: string;
  description: string;
  idEtudiant: number;
  dateDemande: string;
  statut: 'en_attente' | 'acceptee_par_formateur' | 'validee_par_admin' | 'refusee';
  idFormateurAccepteur?: number;
  formationFinaleId?: number;
}

export interface Database {
  admins: Admin[];
  formateurs: Formateur[];
  formations: FormationDetail[];
  etudiants: Etudiant[];
  inscriptions: Inscription[];
  demandesFormation: DemandeFormation[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database$ = new BehaviorSubject<Database | null>(null);
  private isLoading = false;
  private jsonPath = 'assets/data/data.json';

  constructor(private http: HttpClient) {
    this.loadDatabase().subscribe({
      next: (data) => {
        console.log('DatabaseService: Données chargées avec succès depuis Firebase', data);
      },
      error: (err) => {
        console.error('DatabaseService: Erreur lors du chargement depuis Firebase', err);
      }
    });
  }

  /**
   * Charge la base de données depuis Firebase Realtime Database
   */
  loadDatabase(): Observable<Database> {
    return new Observable(observer => {
      if (this.database$.value) {
        observer.next(this.database$.value);
        observer.complete();
        return;
      }

      this.isLoading = true;
      const dbRef = ref(db, '/');

      try {
        onValue(
          dbRef,
          (snapshot: any) => {
            const data = snapshot.val();
            console.log('DatabaseService: Snapshot reçu de Firebase', data);

            if (data) {
              // Normaliser les données
              const normalizedData: Database = {
                admins: data.admins || [],
                formateurs: data.formateurs || [],
                formations: data.formations || [],
                etudiants: data.etudiants || [],
                inscriptions: data.inscriptions || [],
                demandesFormation: data.demandesFormation || []
              };

              this.database$.next(normalizedData);
              this.isLoading = false;
              observer.next(normalizedData);
              observer.complete();
            } else {
              console.warn('DatabaseService: Aucune donnée trouvée dans Firebase, chargement depuis JSON...');
              this.loadFromJSON(observer);
            }
          },
          (error: any) => {
            this.isLoading = false;
            console.error('DatabaseService: Erreur Firebase', error);
            console.log('DatabaseService: Essai de chargement depuis JSON en fallback...');
            this.loadFromJSON(observer);
          }
        );
      } catch (error) {
        this.isLoading = false;
        console.error('DatabaseService: Erreur lors de la connexion à Firebase', error);
        console.log('DatabaseService: Essai de chargement depuis JSON en fallback...');
        this.loadFromJSON(observer);
      }
    });
  }

  /**
   * Charge les données depuis le fichier JSON local et les initialise dans Firebase
   */
  private loadFromJSON(observer: any): void {
    this.http.get<Database>(this.jsonPath).subscribe(
      (data: Database) => {
        console.log('DatabaseService: Données chargées depuis JSON', data);
        // S'assurer que demandesFormation existe
        if (!data.demandesFormation) {
          data.demandesFormation = [];
        }
        this.database$.next(data);
        this.isLoading = false;
        observer.next(data);
        observer.complete();

        // Initialiser Firebase avec les données du JSON
        console.log('DatabaseService: Initialisation de Firebase avec les données du JSON...');
        this.updateFirebase();
      },
      (error: any) => {
        this.isLoading = false;
        console.error('DatabaseService: Erreur lors du chargement depuis JSON', error);
        observer.error(new Error('Impossible de charger les données'));
      }
    );
  }

  /**
   * Obtient la base de données actuelle
   */
  getDatabase(): Database | null {
    return this.database$.value;
  }

  /**
   * Observable de la base de données
   */
  getDatabase$(): Observable<Database | null> {
    return this.database$.asObservable();
  }

  // ===== GESTION DES ADMINS =====

  /**
   * Récupère tous les admins
   */
  getAdmins(): Admin[] {
    return this.database$.value?.admins || [];
  }

  /**
   * Récupère un admin par ID
   */
  getAdminById(id: number): Admin | undefined {
    return this.getAdmins().find(admin => admin.id === id);
  }

  /**
   * Ajoute un nouvel admin
   */
  addAdmin(admin: Omit<Admin, 'id'>): Admin {
    const database = this.database$.value;
    if (!database) return {} as Admin;

    const newAdmin: Admin = {
      id: Math.max(...database.admins.map(a => a.id), 0) + 1,
      ...admin
    };
    database.admins.push(newAdmin);
    this.updateFirebase();
    this.database$.next(database);
    return newAdmin;
  }

  /**
   * Met à jour un admin
   */
  updateAdmin(id: number, adminData: Partial<Admin>): Admin | null {
    const database = this.database$.value;
    if (!database) return null;

    const admin = database.admins.find(a => a.id === id);
    if (admin) {
      Object.assign(admin, adminData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return admin || null;
  }

  /**
   * Supprime un admin
   */
  deleteAdmin(id: number): boolean {
    const database = this.database$.value;
    if (!database) return false;

    const index = database.admins.findIndex(a => a.id === id);
    if (index !== -1) {
      database.admins.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== GESTION DES FORMATEURS =====

  /**
   * Récupère tous les formateurs
   */
  getFormateurs(): Formateur[] {
    return this.database$.value?.formateurs || [];
  }

  /**
   * Récupère un formateur par ID
   */
  getFormateurById(id: number): Formateur | undefined {
    return this.getFormateurs().find(f => f.idFormateur === id);
  }

  /**
   * Récupère les formateurs actifs
   */
  getFormateursActifs(): Formateur[] {
    return this.getFormateurs().filter(f => f.statut === 'actif');
  }

  /**
   * Ajoute un nouveau formateur
   */
  addFormateur(formateur: Omit<Formateur, 'idFormateur'>): Formateur {
    const database = this.database$.value;
    if (!database) return {} as Formateur;

    const newFormateur: Formateur = {
      idFormateur: Math.max(...database.formateurs.map(f => f.idFormateur), 0) + 1,
      ...formateur
    };
    database.formateurs.push(newFormateur);
    this.updateFirebase();
    this.database$.next(database);
    return newFormateur;
  }

  /**
   * Met à jour un formateur
   */
  updateFormateur(id: number, formateurData: Partial<Formateur>): Formateur | null {
    const database = this.database$.value;
    if (!database) return null;

    const formateur = database.formateurs.find(f => f.idFormateur === id);
    if (formateur) {
      Object.assign(formateur, formateurData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return formateur || null;
  }

  /**
   * Supprime un formateur
   */
  deleteFormateur(id: number): boolean {
    const database = this.database$.value;
    if (!database) return false;

    const index = database.formateurs.findIndex(f => f.idFormateur === id);
    if (index !== -1) {
      database.formateurs.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== GESTION DES FORMATIONS =====

  /**
   * Récupère toutes les formations
   */
  getFormations(): FormationDetail[] {
    return this.database$.value?.formations || [];
  }

  /**
   * Récupère une formation par ID
   */
  getFormationById(id: number): FormationDetail | undefined {
    return this.getFormations().find(f => f.idFormation === id);
  }

  /**
   * Récupère les formations valides
   */
  getFormationsValides(): FormationDetail[] {
    return this.getFormations().filter(f => f.statut === 'valide');
  }

  /**
   * Récupère les formations d'un formateur
   */
  getFormationsByFormateur(idFormateur: number): FormationDetail[] {
    return this.getFormations().filter(f => f.idFormateur === idFormateur);
  }

  /**
   * Ajoute une nouvelle formation
   */
  addFormation(formation: Omit<FormationDetail, 'idFormation'>): FormationDetail {
    const database = this.database$.value;
    if (!database) return {} as FormationDetail;

    const newFormation: FormationDetail = {
      idFormation: Math.max(...database.formations.map(f => f.idFormation), 0) + 1,
      ...formation
    };
    database.formations.push(newFormation);
    this.updateFirebase();
    this.database$.next(database);
    return newFormation;
  }

  /**
   * Met à jour une formation
   */
  updateFormation(id: number, formationData: Partial<FormationDetail>): FormationDetail | null {
    const database = this.database$.value;
    if (!database) return null;

    const formation = database.formations.find(f => f.idFormation === id);
    if (formation) {
      Object.assign(formation, formationData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return formation || null;
  }

  /**
   * Supprime une formation
   */
  deleteFormation(id: number): boolean {
    const database = this.database$.value;
    if (!database) return false;

    const index = database.formations.findIndex(f => f.idFormation === id);
    if (index !== -1) {
      database.formations.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== GESTION DES ETUDIANTS =====

  /**
   * Récupère tous les étudiants
   */
  getEtudiants(): Etudiant[] {
    return this.database$.value?.etudiants || [];
  }

  /**
   * Récupère un étudiant par ID
   */
  getEtudiantById(id: number): Etudiant | undefined {
    return this.getEtudiants().find(e => e.idEtudiant === id);
  }

  /**
   * Récupère les étudiants actifs
   */
  getEtudiantsActifs(): Etudiant[] {
    return this.getEtudiants().filter(e => e.statut === 'actif');
  }

  /**
   * Ajoute un nouvel étudiant
   */
  addEtudiant(etudiant: Omit<Etudiant, 'idEtudiant'>): Etudiant {
    const database = this.database$.value;
    if (!database) return {} as Etudiant;

    const newEtudiant: Etudiant = {
      idEtudiant: Math.max(...database.etudiants.map(e => e.idEtudiant), 0) + 1,
      ...etudiant
    };
    database.etudiants.push(newEtudiant);
    this.updateFirebase();
    this.database$.next(database);
    return newEtudiant;
  }

  /**
   * Met à jour un étudiant
   */
  updateEtudiant(id: number, etudiantData: Partial<Etudiant>): Etudiant | null {
    const database = this.database$.value;
    if (!database) return null;

    const etudiant = database.etudiants.find(e => e.idEtudiant === id);
    if (etudiant) {
      Object.assign(etudiant, etudiantData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return etudiant || null;
  }

  /**
   * Supprime un étudiant
   */
  deleteEtudiant(id: number): boolean {
    const database = this.database$.value;
    if (!database) return false;

    const index = database.etudiants.findIndex(e => e.idEtudiant === id);
    if (index !== -1) {
      database.etudiants.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== GESTION DES INSCRIPTIONS =====

  /**
   * Récupère toutes les inscriptions
   */
  getInscriptions(): Inscription[] {
    return this.database$.value?.inscriptions || [];
  }

  /**
   * Récupère une inscription par ID
   */
  getInscriptionById(id: number): Inscription | undefined {
    return this.getInscriptions().find(i => i.idInscription === id);
  }

  /**
   * Récupère les inscriptions d'un étudiant
   */
  getInscriptionsByEtudiant(idEtudiant: number): Inscription[] {
    return this.getInscriptions().filter(i => i.idEtudiant === idEtudiant);
  }

  /**
   * Récupère les inscriptions d'une formation
   */
  getInscriptionsByFormation(idFormation: number): Inscription[] {
    return this.getInscriptions().filter(i => i.idFormation === idFormation);
  }

  /**
   * Récupère les inscriptions payées
   */
  getInscriptionsPaye(): Inscription[] {
    return this.getInscriptions().filter(i => i.statut === 'paye');
  }

  /**
   * Ajoute une nouvelle inscription
   */
  addInscription(inscription: Omit<Inscription, 'idInscription'>): Inscription {
    const database = this.database$.value;
    if (!database) return {} as Inscription;

    const newInscription: Inscription = {
      idInscription: Math.max(...database.inscriptions.map(i => i.idInscription), 0) + 1,
      ...inscription
    };
    database.inscriptions.push(newInscription);
    this.updateFirebase();
    this.database$.next(database);
    return newInscription;
  }

  /**
   * Met à jour une inscription
   */
  updateInscription(id: number, inscriptionData: Partial<Inscription>): Inscription | null {
    const database = this.database$.value;
    if (!database) return null;

    const inscription = database.inscriptions.find(i => i.idInscription === id);
    if (inscription) {
      Object.assign(inscription, inscriptionData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return inscription || null;
  }

  /**
   * Supprime une inscription
   */
  deleteInscription(id: number): boolean {
    const database = this.database$.value;
    if (!database) return false;

    const index = database.inscriptions.findIndex(i => i.idInscription === id);
    if (index !== -1) {
      database.inscriptions.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== GESTION DES DEMANDES DE FORMATION =====

  /**
   * Récupère toutes les demandes de formation
   */
  getDemandesFormation(): DemandeFormation[] {
    return this.database$.value?.demandesFormation || [];
  }

  /**
   * Récupère une demande par ID
   */
  getDemandeFormationById(id: number): DemandeFormation | undefined {
    return this.getDemandesFormation().find(d => d.idDemande === id);
  }

  /**
   * Récupère les demandes d'un étudiant
   */
  getDemandesByEtudiant(idEtudiant: number): DemandeFormation[] {
    return this.getDemandesFormation().filter(d => d.idEtudiant === idEtudiant);
  }

  /**
   * Récupère les demandes en attente de validation par formateur
   */
  getDemandesEnAttenteFormateur(): DemandeFormation[] {
    return this.getDemandesFormation().filter(d => d.statut === 'en_attente');
  }

  /**
   * Récupère les demandes acceptées par formateur mais en attente admin
   */
  getDemandesAccepteesFormateur(): DemandeFormation[] {
    return this.getDemandesFormation().filter(d => d.statut === 'acceptee_par_formateur');
  }

  /**
   * Ajoute une nouvelle demande de formation
   */
  addDemandeFormation(demande: Omit<DemandeFormation, 'idDemande'>): DemandeFormation {
    const database = this.database$.value;
    if (!database) return {} as DemandeFormation;

    // Initialiser demandesFormation si inexistant
    if (!database.demandesFormation) {
      database.demandesFormation = [];
    }

    const newDemande: DemandeFormation = {
      idDemande: Math.max(...database.demandesFormation.map(d => d.idDemande), 0) + 1,
      ...demande
    };
    database.demandesFormation.push(newDemande);
    this.updateFirebase();
    this.database$.next(database);
    return newDemande;
  }

  /**
   * Met à jour une demande de formation
   */
  updateDemandeFormation(id: number, demandeData: Partial<DemandeFormation>): DemandeFormation | null {
    const database = this.database$.value;
    if (!database || !database.demandesFormation) return null;

    const demande = database.demandesFormation.find(d => d.idDemande === id);
    if (demande) {
      Object.assign(demande, demandeData);
      this.updateFirebase();
      this.database$.next(database);
    }
    return demande || null;
  }

  /**
   * Supprime une demande de formation
   */
  deleteDemandeFormation(id: number): boolean {
    const database = this.database$.value;
    if (!database || !database.demandesFormation) return false;

    const index = database.demandesFormation.findIndex(d => d.idDemande === id);
    if (index !== -1) {
      database.demandesFormation.splice(index, 1);
      this.updateFirebase();
      this.database$.next(database);
      return true;
    }
    return false;
  }

  // ===== RECHERCHE ET FILTRAGE AVANCÉ =====

  /**
   * Recherche les formations par intitulé
   */
  searchFormations(query: string): FormationDetail[] {
    const q = query.toLowerCase();
    return this.getFormations().filter(f =>
      f.intitule.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }

  /**
   * Obtient les statistiques
   */
  getStatistiques() {
    const database = this.database$.value;
    if (!database) return null;

    return {
      totalFormateurs: database.formateurs.length,
      formatersActifs: database.formateurs.filter(f => f.statut === 'actif').length,
      totalFormations: database.formations.length,
      formationsValides: database.formations.filter(f => f.statut === 'valide').length,
      totalEtudiants: database.etudiants.length,
      etudiantsActifs: database.etudiants.filter(e => e.statut === 'actif').length,
      totalInscriptions: database.inscriptions.length,
      inscriptionsPaye: database.inscriptions.filter(i => i.statut === 'paye').length,
      revenuTotal: database.inscriptions
        .filter(i => i.statut === 'paye')
        .reduce((sum, i) => {
          const formation = database.formations.find(f => f.idFormation === i.idFormation);
          return sum + (formation?.prix || 0);
        }, 0)
    };
  }

  /**
   * Met à jour les données dans Firebase
   */
  private updateFirebase(): void {
    const database = this.database$.value;
    if (!database) return;

    try {
      const dbRef = ref(db, '/');
      set(dbRef, database)
        .then(() => console.log('DatabaseService: Données mises à jour dans Firebase'))
        .catch((error: any) => console.error('DatabaseService: Erreur lors de la mise à jour Firebase', error));
    } catch (error) {
      console.error('DatabaseService: Erreur lors de la synchronisation Firebase', error);
    }
  }
}
