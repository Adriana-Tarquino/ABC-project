import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = async (route, state) => {
  const injector = inject(Injector);
  const router = inject(Router);
  const { SupabaseService } = await import('../services/supabase.service');
  const supabaseService = injector.get(SupabaseService);

  // Usamos currentUserReady$ que ESPERA a que Supabase termine de verificar
  // si hay una sesión guardada en el navegador antes de decidir
  return firstValueFrom(supabaseService.currentUserReady$.pipe(
    map(user => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  ));
};
