import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Role } from '../model/user.model';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as Role[];
    const userRole = this.auth.getUserRole();

    if (userRole && requiredRoles.includes(userRole)) {
      return true;
    }

    this.router.navigate(['/']);
    return false;
  }
}
