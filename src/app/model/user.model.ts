export type Role = 'userAdmin' | 'userTrainer' | 'userStudent';

export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
}
