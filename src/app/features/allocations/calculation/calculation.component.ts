import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AllocationService } from '../../../core/services/allocation.service';
import { PeriodService } from '../../../core/services/period.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-calculation',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
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

      <section class="abc-calculation-flow" aria-label="Flujo del cálculo ABC">
        <div class="calculation-step" [class.complete]="resourceCount > 0" [class.pending]="resourceCount === 0">
          <span class="step-number">1</span>
          <div>
            <span class="step-label">Recursos</span>
            <strong>{{ resourceCount }} cargados · {{ totalResourceCost | currency }}</strong>
            <small>{{ resourceComplete }}/{{ resourceCount }} con distribución completa</small>
          </div>
        </div>
        <mat-icon class="calculation-arrow">arrow_forward</mat-icon>
        <div class="calculation-step" [class.complete]="activityCount > 0" [class.pending]="activityCount === 0">
          <span class="step-number">2</span>
          <div>
            <span class="step-label">Actividades</span>
            <strong>{{ activityCount }} definidas</strong>
            <small>{{ activityComplete }}/{{ activityCount }} enviadas a productos</small>
          </div>
        </div>
        <mat-icon class="calculation-arrow">arrow_forward</mat-icon>
        <div class="calculation-step" [class.complete]="costObjectCount > 0" [class.pending]="costObjectCount === 0">
          <span class="step-number">3</span>
          <div>
            <span class="step-label">Resultado</span>
            <strong>{{ costObjectCount }} productos o servicios</strong>
            <small>Recibirán el costo final ABC</small>
          </div>
        </div>
      </section>

      <div class="calc-layout">
        <section class="section-card calculation-panel">
          <div>
            <div class="calc-icon">
              <mat-icon>play_circle</mat-icon>
            </div>
            <h2>{{ readyToCalculate ? 'El modelo está listo para calcular' : 'Revisa los pasos pendientes' }}</h2>
            <p *ngIf="readyToCalculate">El motor suma el costo recibido por cada actividad y lo reparte entre tus productos o servicios. Los resultados aparecerán en Reportes.</p>
            <p *ngIf="!readyToCalculate">Completa todos los recursos y actividades al 100%. Así el costo final reflejará todo el gasto del período, sin montos sin distribuir.</p>

            <div *ngIf="isCalculating" class="calculation-live-status" role="status">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <span>El motor está validando porcentajes, distribuyendo costos y preservando el redondeo al centavo.</span>
            </div>

            <button mat-raised-button color="primary" class="primary-action calc-btn" (click)="runCalculation()" [disabled]="isCalculating || isLoading">
              <mat-icon>{{ isCalculating ? 'hourglass_top' : readyToCalculate ? 'play_arrow' : 'fact_check' }}</mat-icon>
              {{ isCalculating ? 'Calculando...' : isLoading ? 'Actualizando estado...' : readyToCalculate ? 'Ejecutar cálculo ABC' : 'Verificar pasos pendientes' }}
            </button>
          </div>
        </section>

        <aside class="checklist">
          <h3>Qué calcula realmente ABC</h3>
          <div class="check-item" [class.is-pending]="resourceComplete !== resourceCount || resourceCount === 0">
            <mat-icon>{{ resourceComplete === resourceCount && resourceCount > 0 ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
            <span><strong>Primero:</strong> cada recurso se reparte entre actividades.</span>
          </div>
          <div class="check-item" [class.is-pending]="activityComplete !== activityCount || activityCount === 0">
            <mat-icon>{{ activityComplete === activityCount && activityCount > 0 ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
            <span><strong>Después:</strong> cada actividad envía su costo a productos.</span>
          </div>
          <div class="check-item">
            <mat-icon>insights</mat-icon>
            <span><strong>Finalmente:</strong> Reportes muestra el costo total por producto.</span>
          </div>
        </aside>
      </div>

      <section class="calculation-explainer" aria-label="Cómo se forma el costo final">
        <div class="calculation-explainer-heading">
          <span class="eyebrow">Vista previa del cálculo</span>
          <h2>Esto es lo que el motor procesará en este período</h2>
        </div>
        <ol>
          <li><span>1</span><p><strong>{{ totalResourceCost | currency }} en recursos.</strong> Se toma el costo de tus {{ resourceCount }} recursos y se multiplica por el porcentaje asignado a cada actividad.</p></li>
          <li><span>2</span><p><strong>{{ activityCount }} actividades acumulan esos importes.</strong> Cada una reúne lo que recibió de los recursos antes de repartirlo.</p></li>
          <li><span>3</span><p><strong>{{ costObjectCount }} productos o servicios reciben el resultado.</strong> El costo final de cada producto es la suma de los aportes de todas las actividades.</p></li>
        </ol>
      </section>
    </div>
  `,
  styles: [`
    .calc-btn { margin-top: 4px; }
  `]
})
export class CalculationComponent implements OnInit {
  private allocationService = inject(AllocationService);
  private feedback = inject(FeedbackService);
  private periods = inject(PeriodService);
  private masterData = inject(MasterDataService);
  isCalculating = false;
  isLoading = true;
  resourceComplete = 0;
  activityComplete = 0;

  get resourceCount() { return this.masterData.resources().length; }
  get activityCount() { return this.masterData.activities().length; }
  get costObjectCount() { return this.masterData.costObjects().length; }
  get totalResourceCost() { return this.masterData.resources().reduce((sum, resource) => sum + Number(resource.total_cost || 0), 0); }
  get readyToCalculate() {
    return this.resourceCount > 0 && this.activityCount > 0 && this.costObjectCount > 0
      && this.resourceComplete === this.resourceCount && this.activityComplete === this.activityCount;
  }

  async ngOnInit() {
    await this.loadModelState();
  }

  private async loadModelState() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.masterData.loadResources(),
        this.masterData.loadActivities(),
        this.masterData.loadCostObjects()
      ]);
      const resourceIds = this.masterData.resources().map(resource => resource.id).filter((id): id is string => !!id);
      const activityIds = this.masterData.activities().map(activity => activity.id).filter((id): id is string => !!id);
      const [resourceTotals, activityTotals] = await Promise.all([
        this.allocationService.loadDistributionTotals('resource', resourceIds),
        this.allocationService.loadDistributionTotals('activity', activityIds)
      ]);
      this.resourceComplete = resourceIds.filter(id => resourceTotals[id] === 100).length;
      this.activityComplete = activityIds.filter(id => activityTotals[id] === 100).length;
    } catch {
      this.feedback.error('No se pudo leer el estado del modelo. Vuelve a abrir esta pantalla.', 'No pudimos revisar el modelo');
    } finally {
      this.isLoading = false;
    }
  }

  async runCalculation() {
    if (this.isCalculating) return;
    this.isCalculating = true;
    try {
      await this.loadModelState();
      if (!this.readyToCalculate) {
        this.feedback.warning('Completa los pasos pendientes antes de calcular. El panel indica qué falta en este período.', 'El modelo aún no está listo');
        return;
      }
      const period = await this.periods.ready();
      await this.allocationService.executeCalculation(period.id);
      this.feedback.success('El período fue procesado. En Reportes encontrarás el costo final de cada producto o servicio.', 'Cálculo ABC completado');
    } catch (error: any) {
      console.error(error);
      this.feedback.error(error.message || 'No se pudo ejecutar el cálculo. Revisa las asignaciones e inténtalo nuevamente.', 'No pudimos calcular el período');
    } finally {
      this.isCalculating = false;
    }
  }
}
