import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Usamos currentUserReady$ que ESPERA a que Supabase termine de verificar
  // si hay una sesión guardada en el navegador antes de decidir
  return supabaseService.currentUserReady$.pipe(
    map(user => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
