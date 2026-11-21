
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn =
  (request, next) => {

    const auth = inject(AuthService);
    const token = auth.getToken();

    // Only attach token to GHARSA API
    const isGharsaApi = request.url.startsWith(
      'https://localhost:7165/api/'
    );

    if (!isGharsaApi || !token) {
      return next(request);
    }

    const authorizedRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authorizedRequest);
  };
