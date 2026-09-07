import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { distinctUntilChanged, map } from 'rxjs';

export interface Period { id: string; company_id: string; name: string; }

@Injectable({ providedIn: 'root' })
export class PeriodService {
  private supabase = inject(SupabaseService);
  current = signal<Period | null>(null);
  private pending?: Promise<Period>;
  private sessionVersion = 0;

  constructor() {
    this.supabase.currentUser$.pipe(map(user => user?.id), distinctUntilChanged()).subscribe(() => {
      this.current.set(null);
      this.pending = undefined;
      this.sessionVersion++;
    });
  }

  async ready(): Promise<Period> {
    if (this.current()) return this.current()!;
    if (this.pending) return this.pending;
    const pending = this.open(new Date().toISOString().slice(0, 7));
    this.pending = pending;
    try { return await pending; }
    finally { if (this.pending === pending) this.pending = undefined; }
  }

  async open(month: string): Promise<Period> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Selecciona un mes válido');
    const version = this.sessionVersion;
    const { data, error } = await this.supabase.client.rpc('open_abc_period', { p_month: month + '-01' });
    if (error) throw error;
    if (version !== this.sessionVersion) throw new Error('La sesión cambió. Vuelve a abrir el período.');
    const period = data as Period;
    this.current.set(period);
    return period;
  }
}
