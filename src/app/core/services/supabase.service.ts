import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, filter, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);
  
  // Este flag indica si ya terminamos de verificar la sesión guardada
  private sessionChecked = new BehaviorSubject<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // Restaurar sesión guardada en el navegador
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser.next(session?.user ?? null);
      this.sessionChecked.next(true); // Ya sabemos si hay sesión o no
    });

    // Escuchar cambios de auth (login, logout, token refresh)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.next(session?.user ?? null);
      if (!this.sessionChecked.value) {
        this.sessionChecked.next(true);
      }
    });
  }

  get currentUser$(): Observable<User | null> {
    return this.currentUser.asObservable();
  }

  /** Espera hasta que la sesión haya sido verificada, luego emite el usuario */
  get currentUserReady$(): Observable<User | null> {
    return new Observable(subscriber => {
      // Esperar a que sessionChecked sea true
      this.sessionChecked.pipe(
        filter(checked => checked),
        take(1)
      ).subscribe(() => {
        subscriber.next(this.currentUser.value);
        subscriber.complete();
      });
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }
}
