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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-activity-allocation',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, 
    MatSelectModule, MatInputModule, MatButtonModule, 
    MatIconModule, MatSnackBarModule
  ],
  templateUrl: './activity-allocation.component.html',
  styleUrls: ['./activity-allocation.component.css']
})
export class ActivityAllocationComponent implements OnInit {
  private fb = inject(FormBuilder);
  public masterData = inject(MasterDataService);
  private allocationService = inject(AllocationService);
  private snackBar = inject(MatSnackBar);

  allocationForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.allocationForm = this.fb.group({
      activity_id: ['', Validators.required],
      distributions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Cargar datos si no están cargados
    this.masterData.loadActivities();
    this.masterData.loadCostObjects();

    // Al seleccionar una actividad, inicializar el FormArray
    this.allocationForm.get('activity_id')?.valueChanges.subscribe(activityId => {
      if (activityId) {
        this.initializeDistributions();
      }
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
        percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
      }));
    });
  }

  get totalPercentage(): number {
    return this.distributionsArray.controls.reduce((sum, ctrl) => sum + (ctrl.value.percentage || 0), 0);
  }

  get allocationProgress(): number {
    return Math.min(this.totalPercentage, 100);
  }

  get remainingPercentage(): number {
    return Math.max(100 - this.totalPercentage, 0);
  }

  async onSubmit() {
    if (this.allocationForm.invalid) return;

    if (this.totalPercentage > 100) {
      this.snackBar.open('El porcentaje total no puede superar el 100%', 'OK', { duration: 3000 });
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
        percentage: d.percentage / 100 // Guardamos como decimal 0.XX
      }));

    try {
      await this.allocationService.saveActivityDistributions(distributionsToSave);
      this.snackBar.open('Asignaciones guardadas correctamente', 'OK', { duration: 3000 });
      this.allocationForm.reset();
      this.distributionsArray.clear();
    } catch (error) {
      console.error(error);
      this.snackBar.open('Error al guardar asignaciones', 'OK', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }
}
