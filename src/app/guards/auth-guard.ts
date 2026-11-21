
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  // Allow access when user is logged in
  if (auth.isLoggedIn()) {
    return true;
  }

  // Redirect to Login when not logged in
  return router.createUrlTree(['/login']);
};
