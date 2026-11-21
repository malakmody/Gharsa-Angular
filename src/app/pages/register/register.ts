
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../services/auth';

function passwordsMatch(
  control: AbstractControl
): ValidationErrors | null {

  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;

  return password === confirm
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    fullName: ['', [
      Validators.required,
      Validators.maxLength(100)
    ]],

    email: ['', [
      Validators.required,
      Validators.email
    ]],

    password: ['', [
      Validators.required,
      Validators.minLength(8)
    ]],

    confirmPassword: ['', [
      Validators.required
    ]]
  }, {
    validators: passwordsMatch
  });

  get fullName() {
    return this.form.controls.fullName;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  register(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const values = this.form.getRawValue();

    this.auth.register({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/home');
      },

      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.loading.set(false);

        if (err.status === 409) {
          this.errorMessage.set(
            'This email is already registered.'
          );
        } else if (err.status === 0) {
          this.errorMessage.set(
            'Cannot connect to the server. Make sure GHARSA.API is running.'
          );
        } else {
          this.errorMessage.set(
            'Unable to create your account.'
          );
        }
      }
    });
  }
}
