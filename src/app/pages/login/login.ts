
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  AuthService
} from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  // Login Form
  form = this.fb.nonNullable.group({
    email: ['', [
      Validators.required,
      Validators.email
    ]],

    password: ['', [
      Validators.required
    ]]
  });

  // Email Control
  get email() {
    return this.form.controls.email;
  }

  // Password Control
  get password() {
    return this.form.controls.password;
  }

  // Show / Hide Password
  togglePassword(): void {
    this.showPassword.update(
      value => !value
    );
  }

  // Login
  login(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const loginData = this.form.getRawValue();

    this.auth.login(loginData).subscribe({

      next: () => {

        this.loading.set(false);

        // Redirect based on user role
        if (this.auth.isAdmin()) {

          // Admin Dashboard
          this.router.navigateByUrl('/admin');

        } else {

          // Normal User Dashboard
          this.router.navigateByUrl('/home');

        }
      },

      error: (err: HttpErrorResponse) => {

        console.error(
          'Login Error:',
          err
        );

        this.loading.set(false);

        if (err.status === 401) {

          this.errorMessage.set(
            'Invalid email or password.'
          );

        } else if (err.status === 0) {

          this.errorMessage.set(
            'Cannot connect to the server. Make sure GHARSA.API is running.'
          );

        } else {

          this.errorMessage.set(
            'Unable to sign in. Please try again.'
          );

        }
      }

    });
  }
}
