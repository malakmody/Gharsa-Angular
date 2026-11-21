import {
  Injectable,
  inject,
  signal
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

// USER INFORMATION
export interface UserInfo {
  userId: number;
  fullName: string;
  email: string;
  createdAt: string;
  role: 'Admin' | 'User';
}

// AUTHENTICATION RESPONSE
export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserInfo;
}

// REGISTER REQUEST
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

// LOGIN REQUEST
export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private apiUrl =
    'https://localhost:7165/api/Auth';

  // CURRENT LOGGED-IN USER
  currentUser = signal<UserInfo | null>(null);

  constructor() {
    this.currentUser.set(
      this.readStoredUser()
    );
  }

  // =========================
  // READ STORED USER
  // =========================

  private readStoredUser(): UserInfo | null {

    const token = this.getToken();

    if (!token) {
      return null;
    }

    const stored = localStorage.getItem('gharsa_user');

    if (!stored) {
      this.clearSession();
      return null;
    }

    try {

      const user = JSON.parse(stored) as UserInfo;

      // VALIDATE STORED USER DATA
      if (
        !user ||
        typeof user.userId !== 'number' ||
        typeof user.fullName !== 'string' ||
        typeof user.email !== 'string' ||
        !['Admin', 'User'].includes(user.role)
      ) {
        this.clearSession();
        return null;
      }

      return user;

    } catch {

      // CLEAR INVALID SESSION DATA
      this.clearSession();

      return null;
    }
  }

  // =========================
  // REGISTER
  // =========================

  register(data: RegisterRequest) {

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/register`,
      data
    ).pipe(
      tap(response => this.saveSession(response))
    );
  }

  // =========================
  // LOGIN
  // =========================

  login(data: LoginRequest) {

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      data
    ).pipe(
      tap(response => this.saveSession(response))
    );
  }

  // =========================
  // SAVE SESSION
  // =========================

  private saveSession(response: AuthResponse): void {

    localStorage.setItem(
      'gharsa_token',
      response.token
    );

    localStorage.setItem(
      'gharsa_expires',
      response.expiresAt
    );

    localStorage.setItem(
      'gharsa_user',
      JSON.stringify(response.user)
    );

    this.currentUser.set(response.user);
  }

  // =========================
  // GET TOKEN
  // =========================

  getToken(): string | null {

    const token = localStorage.getItem('gharsa_token');

    const expires = localStorage.getItem('gharsa_expires');

    // CHECK SESSION DATA
    if (!token || !expires) {

      this.clearSession();

      this.currentUser.set(null);

      return null;
    }

    const expiryTime = new Date(expires).getTime();

    // CHECK TOKEN EXPIRATION
    if (
      !Number.isFinite(expiryTime) ||
      expiryTime <= Date.now()
    ) {

      this.clearSession();

      this.currentUser.set(null);

      return null;
    }

    return token;
  }

  // =========================
  // CHECK LOGIN STATUS
  // =========================

  isLoggedIn(): boolean {

    return !!this.getToken();
  }

  // =========================
  // CHECK ADMIN ROLE
  // =========================

  isAdmin(): boolean {

    return (
      this.isLoggedIn() &&
      this.currentUser()?.role === 'Admin'
    );
  }

  // =========================
  // CLEAR SESSION
  // =========================

  private clearSession(): void {

    localStorage.removeItem('gharsa_token');

    localStorage.removeItem('gharsa_expires');

    localStorage.removeItem('gharsa_user');
  }

  // =========================
  // LOGOUT
  // =========================

  logout(): void {

    this.clearSession();

    this.currentUser.set(null);
  }

}