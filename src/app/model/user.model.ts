export type Role = 'userAdmin' | 'userTrainer' | 'userStudent';

export type TrainerLevel = 'autre' | 'licence' | 'master' | 'ingenieur' | 'magister' | 'doctorat';
export type StudentLevel = 'bac+1' | 'bac+2' | 'bac+3' | 'bac+4' | 'bac+5' | 'bac+6' | 'bac+7' | 'bac+8';

export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  level?: TrainerLevel | StudentLevel;
  specialty?: string;
}
