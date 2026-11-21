
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
  AuthService,
  UserInfo
} from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    RouterLink
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  auth = inject(AuthService);

  private apiUrl =
    'https://localhost:7165/api/Users/me';

  user = signal<UserInfo | null>(null);

  loading = signal(true);
  saving = signal(false);
  editing = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  // Only FullName can be edited
  form = this.fb.nonNullable.group({
    fullName: ['', [
      Validators.required,
      Validators.maxLength(100)
    ]]
  });

  get fullName() {
    return this.form.controls.fullName;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  // LOAD CURRENT USER PROFILE
  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.http.get<UserInfo>(this.apiUrl)
      .subscribe({

        next: (data) => {
          this.user.set(data);

          this.form.patchValue({
            fullName: data.fullName
          });

          this.auth.currentUser.set(data);

          localStorage.setItem(
            'gharsa_user',
            JSON.stringify(data)
          );

          this.loading.set(false);
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Profile loading error:',
            error
          );

          this.errorMessage.set(
            error.status === 401
              ? 'Your session has expired. Please sign in again.'
              : 'Unable to load your profile.'
          );

          this.loading.set(false);
        }
      });
  }

  // START EDITING
  startEditing(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    this.form.patchValue({
      fullName: this.user()?.fullName ?? ''
    });

    this.editing.set(true);
  }

  // CANCEL EDITING
  cancelEditing(): void {
    this.form.reset({
      fullName: this.user()?.fullName ?? ''
    });

    this.editing.set(false);
    this.errorMessage.set('');
  }

  // SAVE PROFILE
  saveProfile(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = {
      fullName: this.form.controls.fullName.value.trim()
    };

    if (!request.fullName) {
      this.fullName.setErrors({
        required: true
      });

      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.put<UserInfo>(
      this.apiUrl,
      request
    ).subscribe({

      next: (updatedUser) => {

        this.user.set(updatedUser);

        this.form.patchValue({
          fullName: updatedUser.fullName
        });

        this.auth.currentUser.set(updatedUser);

        localStorage.setItem(
          'gharsa_user',
          JSON.stringify(updatedUser)
        );

        this.saving.set(false);
        this.editing.set(false);

        this.successMessage.set(
          'Your profile has been updated successfully!'
        );
      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'Profile update error:',
          error
        );

        this.saving.set(false);

        if (error.status === 401) {
          this.errorMessage.set(
            'Your session has expired. Please sign in again.'
          );
        } else {
          this.errorMessage.set(
            'Unable to update your profile. Please try again.'
          );
        }
      }
    });
  }

  // GET USER INITIALS
  getInitials(): string {
    const name = this.user()?.fullName?.trim();

    if (!name) {
      return 'G';
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  // LOGOUT
  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
