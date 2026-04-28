import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Role, StudentLevel, TrainerLevel, User } from '../../model/user.model';
import { AuthService } from '../../services/auth';

type RegisterForm = Omit<User, 'role'> & { role: Role | '' };

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    CommonModule,
    RouterModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  user: RegisterForm = {
    id: 0,
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: '',
    level: undefined,
    specialty: ''
  };
  successMessage = '';

  trainerLevels: TrainerLevel[] = ['autre', 'licence', 'master', 'ingenieur', 'magister', 'doctorat'];
  studentLevels: StudentLevel[] = ['bac+1', 'bac+2', 'bac+3', 'bac+4', 'bac+5', 'bac+6', 'bac+7', 'bac+8'];

  constructor(private auth: AuthService, private router: Router) {}

  onRoleChange() {
    // Reset level and specialty when role changes
    this.user.level = undefined;
    this.user.specialty = '';
  }

  onSubmit() {
    if (this.user.role === '') {
      return;
    }

    // Validate required fields based on role
    if (this.user.role === 'userTrainer' && (!this.user.level || !this.user.specialty)) {
      return;
    }

    if (this.user.role === 'userStudent' && !this.user.level) {
      return;
    }

    const registerUser: User = {
      ...this.user,
      role: this.user.role
    };

    if (this.auth.register(registerUser)) {
      this.successMessage = 'Compte créé avec succès !';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
