import { Injectable } from '@angular/core';
// import { Formation } from '../model/user.model';

interface Formation {
  id: number;
  title: string;
  duree:string;
  prix:string;
  description:string
}

@Injectable({
  providedIn: 'root'
})
export class FormationService {
  private formations: Formation[] = [
    {
      id: 1,
      title: 'Angular pour débutants',
      duree:'35h',
      prix:'15550 DA',
      description:'Description...'
    },
    {
      id: 2,
      title: 'Développement Full Stack',
      duree:'45h',
      prix:'14450 DA',
      description:'Description...'
    },
    {
      id: 3,
      title: 'UX Design avancé',
      duree:'25h',
      prix:'25450 DA',
     description:'Description...'
    }
    ,
    {
      id: 4,
      title: 'UX Design avancé',
      duree:'25h',
      prix:'25450 DA',
      description:'Description...'
    }
    ,
    {
      id: 5,
      title: 'UX Design avancé',
      duree:'25h',
      prix:'25450 DA',
      description:'Description...'
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
