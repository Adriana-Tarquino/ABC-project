import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MasterDataService } from '../../../core/services/master-data.service';
import { AllocationService, ActivityDistribution } from '../../../core/services/allocation.service';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-activity-allocation',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, 
    MatSelectModule, MatInputModule, MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './activity-allocation.component.html',
  styleUrls: ['./activity-allocation.component.css']
})
export class ActivityAllocationComponent implements OnInit {
  private fb = inject(FormBuilder);
  public masterData = inject(MasterDataService);
  private allocationService = inject(AllocationService);
  private feedback = inject(FeedbackService);

  private destroyRef = inject(DestroyRef);
  private selectionVersion = 0;
  private destroyed = false;
  allocationForm: FormGroup;
  isSubmitting = false;
  allocationTotals: Record<string, number> = {};
  activityPoolCost = 0;

  constructor() {
    this.destroyRef.onDestroy(() => { this.destroyed = true; });
    this.allocationForm = this.fb.group({
      activity_id: ['', Validators.required],
      distributions: this.fb.array([])
    });
  }

  async ngOnInit(): Promise<void> {
    this.allocationForm.disable();
    try {
      await Promise.all([this.masterData.loadActivities(), this.masterData.loadCostObjects()]);
      if (this.destroyed) return;
      await this.refreshAllocationTotals();
      if (this.destroyed) return;
      this.allocationForm.enable();
    } catch { this.feedback.error('No se pudieron cargar los datos. Vuelve a abrir esta pantalla.', 'No pudimos cargar las asignaciones'); }
    this.allocationForm.get('activity_id')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async source => {
      const version = ++this.selectionVersion;
      this.distributionsArray.clear();
      this.activityPoolCost = 0;
      if (!source) return;
      this.isSubmitting = true;
      try {
        const [saved, poolCost] = await Promise.all([
          this.allocationService.loadDistributions('activity', source),
          this.allocationService.loadActivityPoolCost(source)
        ]);
        if (version !== this.selectionVersion || this.destroyed) return;
        this.activityPoolCost = poolCost;
        this.initializeDistributions();
        this.distributionsArray.controls.forEach(control => {
          const row = saved.find(row => row['cost_object_id'] === control.value.cost_object_id);
          control.get('percentage')?.setValue(Math.round(Number(row?.percentage || 0) * 10000) / 100);
        });
      } catch { this.feedback.error('No se pudieron recuperar las asignaciones de la actividad seleccionada.', 'No pudimos cargar la distribución'); }
      finally { if (version === this.selectionVersion) this.isSubmitting = false; }
    });
  }

  get distributionsArray(): FormArray {
    return this.allocationForm.get('distributions') as FormArray;
  }

  initializeDistributions() {
    this.distributionsArray.clear();
    const costObjects = this.masterData.costObjects();
    
    // Para cada producto/servicio, creamos un control de porcentaje (0 a 100)
    costObjects.forEach(co => {
      this.distributionsArray.push(this.fb.group({
        cost_object_id: [co.id],
        cost_object_name: [{ value: co.name, disabled: true }],
        percentage: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
      }));
    });
  }

  get totalPercentage(): number {
    return Math.round(this.distributionsArray.controls.reduce((sum, ctrl) => sum + Number(ctrl.value.percentage || 0), 0) * 100) / 100;
  }

  get allocationProgress(): number {
    return Math.min(this.totalPercentage, 100);
  }

  get remainingPercentage(): number {
    return Math.max(100 - this.totalPercentage, 0);
  }

  get selectedActivity() {
    const id = this.allocationForm.get('activity_id')?.value;
    return this.masterData.activities().find(activity => activity.id === id);
  }

  allocatedCost(percentage: number | string | null | undefined): number {
    return this.activityPoolCost * Number(percentage || 0) / 100;
  }

  allocationTotal(activityId?: string): number {
    return activityId ? this.allocationTotals[activityId] || 0 : 0;
  }

  allocationLabel(activityId?: string): string {
    const total = this.allocationTotal(activityId);
    if (total === 0) return 'Sin asignar';
    if (total === 100) return 'Completo · 100%';
    return `En curso · ${total}%`;
  }

  allocationClass(activityId?: string): string {
    const total = this.allocationTotal(activityId);
    if (total === 100) return 'complete';
    return total === 0 ? 'empty' : 'partial';
  }

  private async refreshAllocationTotals() {
    const ids = this.masterData.activities().map(activity => activity.id).filter((id): id is string => !!id);
    this.allocationTotals = await this.allocationService.loadDistributionTotals('activity', ids);
  }

  async onSubmit() {
    if (this.allocationForm.disabled || this.allocationForm.invalid || this.isSubmitting || !this.distributionsArray.length) return;

    if (this.totalPercentage > 100) {
      this.feedback.warning('Reduce alguno de los porcentajes hasta que el total sea 100% o menor.');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.allocationForm.getRawValue();
    const activityId = formValue.activity_id;

    // Solo enviar distribuciones > 0
    const distributionsToSave: ActivityDistribution[] = formValue.distributions
      .filter((d: any) => d.percentage > 0)
      .map((d: any) => ({
        activity_id: activityId,
        cost_object_id: d.cost_object_id,
        percentage: Number((d.percentage / 100).toFixed(4))
      }));

    try {
      await this.allocationService.saveActivityDistributions(distributionsToSave, activityId);
      this.allocationTotals = { ...this.allocationTotals, [activityId]: this.totalPercentage };
      const status = this.totalPercentage === 100 ? 'quedó completa y lista para calcular.' : `quedó en ${this.totalPercentage}% y puedes completarla después.`;
      this.feedback.success(`La distribución ${status}`, 'Distribución guardada');
      this.allocationForm.reset();
      this.distributionsArray.clear();
    } catch (error) {
      console.error(error);
      this.feedback.error('No se pudieron guardar los cambios. Revisa tu conexión e inténtalo nuevamente.', 'No guardamos la distribución');
    } finally {
      this.isSubmitting = false;
    }
  }
}
