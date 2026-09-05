import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
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
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
