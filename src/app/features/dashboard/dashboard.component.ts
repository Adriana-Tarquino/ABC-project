import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../core/services/period.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackService } from '../../core/services/feedback.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  periods = inject(PeriodService);
  month = new Date().toISOString().slice(0, 7);
  ready = false;
  busy = false;
  private feedback = inject(FeedbackService);

  async ngOnInit() { await this.changePeriod(); }

  async changePeriod() {
    if (this.busy) return;
    this.busy = true;
    this.ready = false;
    try {
      await this.periods.open(this.month);
      this.ready = true;
    } catch {
      this.feedback.error('Comprueba tu conexión y que las migraciones de Supabase estén aplicadas antes de volver a intentarlo.', 'No pudimos abrir el período');
    } finally { this.busy = false; }
  }
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  user$ = this.supabase.currentUser$;
  navGroups = [
    {
      label: 'Datos maestros',
      items: [
        { label: 'Recursos', route: 'resources', icon: 'account_balance_wallet' },
        { label: 'Actividades', route: 'activities', icon: 'hub' },
        { label: 'Productos', route: 'cost-objects', icon: 'inventory_2' }
      ]
    },
    {
      label: 'Operación ABC',
      items: [
        { label: 'Recursos a actividades', route: 'resource-allocation', icon: 'schema' },
        { label: 'Actividades a productos', route: 'activity-allocation', icon: 'account_tree' },
        { label: 'Cálculo ABC', route: 'calculation', icon: 'calculate' }
      ]
    },
    {
      label: 'Análisis',
      items: [
        { label: 'Reportes', route: 'reports', icon: 'query_stats' }
      ]
    }
  ];

  async logout() {
    try {
      const { error } = await this.supabase.signOut();
      if (error) throw error;
      await this.router.navigate(['/login']);
    } catch { this.feedback.error('No se pudo cerrar la sesión. Inténtalo nuevamente.', 'No pudimos cerrar la sesión'); }
  }
}
