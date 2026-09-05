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
  message = '';
  hidePassword = true;

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Si ya hay sesión activa, redirigir directamente
    this.supabase.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.message = '';
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;

    try {
      // 1. Intentar iniciar sesión con correo y contraseña
      const { data, error } = await this.supabase.signIn(email, password);
      
      if (error) {
        // 2. Si no existe el usuario, registrarlo automáticamente
        if (error.message.includes('Invalid login credentials')) {
          const signUpResult = await this.supabase.signUp(email, password);
          
          if (signUpResult.error) {
            throw signUpResult.error;
          }

          // Si el signUp devuelve usuario y sesión, redirigir
          if (signUpResult.data.session) {
            this.router.navigate(['/dashboard']);
            return;
          }

          // Si requiere confirmación de correo
          this.message = 'Cuenta creada. Revisa tu correo para confirmar, o desactiva la confirmación en Supabase.';
        } else {
          throw error;
        }
      } else if (data.session) {
        // Login exitoso: redirigir al dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      this.message = error.message || 'Error desconocido';
    } finally {
      this.loading = false;
    }
  }
}
