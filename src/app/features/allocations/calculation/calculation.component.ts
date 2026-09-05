import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AllocationService } from '../../../core/services/allocation.service';
import { MasterDataService } from '../../../core/services/master-data.service';

@Component({
  selector: 'app-calculation',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="calc-container page-surface">
      <header class="page-header">
        <div>
          <span class="eyebrow">Operación ABC</span>
          <h1>Ejecución del modelo</h1>
          <p class="subtitle">Procesa las asignaciones configuradas y genera los costos finales por producto o servicio.</p>
        </div>
        <div class="header-badge">
          <mat-icon>calculate</mat-icon>
          <span>Motor ABC</span>
        </div>
      </header>

      <div class="calc-layout">
        <section class="section-card calculation-panel">
          <div>
            <div class="calc-icon">
              <mat-icon>play_circle</mat-icon>
            </div>
            <h2>Calcular costos del periodo</h2>
            <p>Ejecuta el proceso cuando los recursos, actividades y porcentajes de distribución estén listos para consolidar el resultado.</p>

            <button mat-raised-button color="primary" class="primary-action calc-btn" (click)="runCalculation()" [disabled]="isCalculating">
              <mat-icon>{{ isCalculating ? 'hourglass_top' : 'play_arrow' }}</mat-icon>
              {{ isCalculating ? 'Calculando...' : 'Ejecutar cálculo ABC' }}
            </button>
          </div>
        </section>

        <aside class="checklist">
          <h3>Preparación recomendada</h3>
          <div class="check-item">
            <mat-icon>check_circle</mat-icon>
            <span>Recursos cargados con sus costos totales.</span>
          </div>
          <div class="check-item">
            <mat-icon>check_circle</mat-icon>
            <span>Actividades operativas definidas.</span>
          </div>
          <div class="check-item">
            <mat-icon>check_circle</mat-icon>
            <span>Porcentajes revisados antes de ejecutar.</span>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .calc-btn { margin-top: 4px; }
  `]
})
export class CalculationComponent {
  private allocationService = inject(AllocationService);
  private snackBar = inject(MatSnackBar);
  
  isCalculating = false;

  async runCalculation() {
    this.isCalculating = true;
    try {
      // Usamos un ID dummy o null por ahora, hasta implementar el selector de periodos
      await this.allocationService.executeCalculation('00000000-0000-0000-0000-000000000000');
      this.snackBar.open('¡Cálculo ejecutado exitosamente!', 'OK', { duration: 5000 });
    } catch (error: any) {
      console.error(error);
      this.snackBar.open('Hubo un error al ejecutar el cálculo: ' + error.message, 'Cerrar', { duration: 5000 });
    } finally {
      this.isCalculating = false;
    }
  }
}
