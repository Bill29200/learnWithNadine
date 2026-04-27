import { Injectable } from '@angular/core';
// import { Formation } from '../model/user.model';

interface Formation {
  id: number;
  title: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormationService {
  private formations: Formation[] = [
    {
      id: 1,
      title: 'Angular pour débutants'
    },
    {
      id: 2,
      title: 'Développement Full Stack'
    },
    {
      id: 3,
      title: 'UX Design avancé'
    }
  ];

  getFormations(): Formation[] {
    return this.formations;
  }

  getFormationById(id: number): Formation | undefined {
    return this.formations.find(f => f.id === id);
  }

  addFormation(formation: Formation) {
    formation.id = Date.now();
    this.formations.push(formation);
  }

  updateFormation(formation: Formation) {
    const index = this.formations.findIndex(f => f.id === formation.id);
    if (index !== -1) this.formations[index] = formation;
  }
}
