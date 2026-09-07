import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MasterDataService } from '../../../core/services/master-data.service';
import { AllocationService, ResourceDistribution } from '../../../core/services/allocation.service';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-resource-allocation',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, 
    MatSelectModule, MatInputModule, MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './resource-allocation.component.html',
  styleUrls: ['./resource-allocation.component.css']
})
export class ResourceAllocationComponent implements OnInit {
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

  constructor() {
    this.destroyRef.onDestroy(() => { this.destroyed = true; });
    this.allocationForm = this.fb.group({
      resource_id: ['', Validators.required],
      distributions: this.fb.array([])
    });
  }

  async ngOnInit(): Promise<void> {
    this.allocationForm.disable();
    try {
      await Promise.all([this.masterData.loadResources(), this.masterData.loadActivities()]);
      if (this.destroyed) return;
      await this.refreshAllocationTotals();
      if (this.destroyed) return;
      this.allocationForm.enable();
    } catch { this.feedback.error('No se pudieron cargar los datos. Vuelve a abrir esta pantalla.', 'No pudimos cargar las asignaciones'); }
    this.allocationForm.get('resource_id')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async source => {
      const version = ++this.selectionVersion;
      this.distributionsArray.clear();
      if (!source) return;
      this.isSubmitting = true;
      try {
        const saved = await this.allocationService.loadDistributions('resource', source);
        if (version !== this.selectionVersion || this.destroyed) return;
        this.initializeDistributions();
        this.distributionsArray.controls.forEach(control => {
          const row = saved.find(row => row['activity_id'] === control.value.activity_id);
          control.get('percentage')?.setValue(Math.round(Number(row?.percentage || 0) * 10000) / 100);
        });
      } catch { this.feedback.error('No se pudieron recuperar las asignaciones del recurso seleccionado.', 'No pudimos cargar la distribución'); }
      finally { if (version === this.selectionVersion) this.isSubmitting = false; }
    });
  }

  get distributionsArray(): FormArray {
    return this.allocationForm.get('distributions') as FormArray;
  }

  initializeDistributions() {
    this.distributionsArray.clear();
    const activities = this.masterData.activities();
    
    // Para cada actividad, creamos un control de porcentaje (0 a 100)
    activities.forEach(act => {
      this.distributionsArray.push(this.fb.group({
        activity_id: [act.id],
        activity_name: [{ value: act.name, disabled: true }],
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

  get selectedResource() {
    const id = this.allocationForm.get('resource_id')?.value;
    return this.masterData.resources().find(resource => resource.id === id);
  }

  allocatedCost(percentage: number | string | null | undefined): number {
    return Number(this.selectedResource?.total_cost || 0) * Number(percentage || 0) / 100;
  }

  allocationTotal(resourceId?: string): number {
    return resourceId ? this.allocationTotals[resourceId] || 0 : 0;
  }

  allocationLabel(resourceId?: string): string {
    const total = this.allocationTotal(resourceId);
    if (total === 0) return 'Sin asignar';
    if (total === 100) return 'Completo · 100%';
    return `En curso · ${total}%`;
  }

  allocationClass(resourceId?: string): string {
    const total = this.allocationTotal(resourceId);
    if (total === 100) return 'complete';
    return total === 0 ? 'empty' : 'partial';
  }

  private async refreshAllocationTotals() {
    const ids = this.masterData.resources().map(resource => resource.id).filter((id): id is string => !!id);
    this.allocationTotals = await this.allocationService.loadDistributionTotals('resource', ids);
  }

  async onSubmit() {
    if (this.allocationForm.disabled || this.allocationForm.invalid || this.isSubmitting || !this.distributionsArray.length) return;

    if (this.totalPercentage > 100) {
      this.feedback.warning('Reduce alguno de los porcentajes hasta que el total sea 100% o menor.');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.allocationForm.getRawValue();
    const resourceId = formValue.resource_id;

    // Solo enviar distribuciones > 0
    const distributionsToSave: ResourceDistribution[] = formValue.distributions
      .filter((d: any) => d.percentage > 0)
      .map((d: any) => ({
        resource_id: resourceId,
        activity_id: d.activity_id,
        percentage: Number((d.percentage / 100).toFixed(4))
      }));

    try {
      await this.allocationService.saveResourceDistributions(distributionsToSave, resourceId);
      this.allocationTotals = { ...this.allocationTotals, [resourceId]: this.totalPercentage };
      const status = this.totalPercentage === 100 ? 'quedó completo y listo para calcular.' : `quedó en ${this.totalPercentage}% y puedes continuarlo después.`;
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
