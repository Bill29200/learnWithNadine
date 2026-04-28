import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

export interface Database {
  admins: Admin[];
  formateurs: Formateur[];
  formations: FormationDetail[];
  etudiants: Etudiant[];
  inscriptions: Inscription[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dataPath = 'data/data.json';
  private database$ = new BehaviorSubject<Database | null>(null);
  private isLoading = false;

  constructor(private http: HttpClient) {
    this.loadDatabase().subscribe({
      next: (data) => {
        console.log('DatabaseService: Données chargées avec succès', data);
      },
      error: (err) => {
        console.error('DatabaseService: Erreur lors du chargement', err);
      }
    });
  }

  /**
   * Charge la base de données JSON
   */
  loadDatabase(): Observable<Database> {
    return new Observable(observer => {
      if (this.database$.value) {
        observer.next(this.database$.value);
        observer.complete();
        return;
      }

      this.isLoading = true;
      this.http.get<Database>(this.dataPath).subscribe(
        data => {
          this.database$.next(data);
          this.isLoading = false;
          observer.next(data);
          observer.complete();
        },
        error => {
          this.isLoading = false;
          console.error('Erreur lors du chargement de la base de données', error);
          observer.error(error);
        }
      );
    });
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
}
