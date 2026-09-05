import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), 
    canActivate: [authGuard],
    children: [
      { path: 'resources', loadComponent: () => import('./features/masters/resources/resources.component').then(m => m.ResourcesComponent) },
      { path: 'activities', loadComponent: () => import('./features/masters/activities/activities.component').then(m => m.ActivitiesComponent) },
      { path: 'cost-objects', loadComponent: () => import('./features/masters/cost-objects/cost-objects.component').then(m => m.CostObjectsComponent) },
      { path: 'resource-allocation', loadComponent: () => import('./features/allocations/resource-allocation/resource-allocation.component').then(m => m.ResourceAllocationComponent) },
      { path: 'activity-allocation', loadComponent: () => import('./features/allocations/activity-allocation/activity-allocation.component').then(m => m.ActivityAllocationComponent) },
      { path: 'calculation', loadComponent: () => import('./features/allocations/calculation/calculation.component').then(m => m.CalculationComponent) },
      { path: 'reports', loadComponent: () => import('./features/reports/reports-dashboard/reports-dashboard.component').then(m => m.ReportsDashboardComponent) },
      { path: '', redirectTo: 'resources', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
