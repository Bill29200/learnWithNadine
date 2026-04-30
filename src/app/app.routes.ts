import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './admin/admin-dashboard/admin-dashboard';
import { LoginComponent } from './auth/login/login';
import { Register } from './auth/register/register';
import { EtudiantDashboard } from './etudiant/etudiant-dashboard/etudiant-dashboard';
import { FormateurDashboard } from './formateur/formateur-dashboard/formateur-dashboard';
import { FormationDetail } from './formation/formation-detail/formation-detail';
import { FormationList } from './formation/formation-list/formation-list';
import { AuthGuard } from './guards/auth-guard';
import { RoleGuard } from './guards/role-guard';
import { InscriptionFormComponent } from './inscription/inscription-form/inscription-form';
import { MainComponent } from './main/main';

export const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: Register },
  {
    path: 'formations',
    component: FormationList,
    canActivate: [AuthGuard]
  },
  {
    path: 'formation/:id',
    component: FormationDetail,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['userAdmin'] }
  },
  {
    path: 'formateur',
    component: FormateurDashboard,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['userAdmin', 'userTrainer'] }
  },
  {
    path: 'etudiant',
    component: EtudiantDashboard,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['userAdmin', 'userStudent'] }
  },
  {
    path: 'inscription',
    component: InscriptionFormComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['userAdmin', 'userStudent'] }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
