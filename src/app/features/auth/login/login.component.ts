import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../../core/services/supabase.service';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  registering = false;
  private destroyRef = inject(DestroyRef);
  hidePassword = true;

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private feedback = inject(FeedbackService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Si ya hay sesión activa, redirigir directamente
    this.supabase.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid || this.loading) return;

    this.loading = true;
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;

    try {
      const { data, error } = await (this.registering
        ? this.supabase.signUp(email.trim(), password)
        : this.supabase.signIn(email.trim(), password));
      if (error) throw error;
      if (data.session) await this.router.navigate(['/dashboard']);
      else if (this.registering) this.feedback.info('Revisa tu correo y confirma tu cuenta antes de iniciar sesión.', 'Confirma tu cuenta');
    } catch (error: any) {
      this.feedback.error(error.message || 'No se pudo validar el acceso. Inténtalo nuevamente.', 'No pudimos ingresar');
    } finally {
      this.loading = false;
    }
  }
}
