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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-resource-allocation',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, 
    MatSelectModule, MatInputModule, MatButtonModule, 
    MatIconModule, MatSnackBarModule
  ],
  templateUrl: './resource-allocation.component.html',
  styleUrls: ['./resource-allocation.component.css']
})
export class ResourceAllocationComponent implements OnInit {
  private fb = inject(FormBuilder);
  public masterData = inject(MasterDataService);
  private allocationService = inject(AllocationService);
  private snackBar = inject(MatSnackBar);

  allocationForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.allocationForm = this.fb.group({
      resource_id: ['', Validators.required],
      distributions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Cargar datos si no están cargados
    this.masterData.loadResources();
    this.masterData.loadActivities();

    // Al seleccionar un recurso, inicializar el FormArray
    this.allocationForm.get('resource_id')?.valueChanges.subscribe(resourceId => {
      if (resourceId) {
        this.initializeDistributions();
      }
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
    const resourceId = formValue.resource_id;

    // Solo enviar distribuciones > 0
    const distributionsToSave: ResourceDistribution[] = formValue.distributions
      .filter((d: any) => d.percentage > 0)
      .map((d: any) => ({
        resource_id: resourceId,
        activity_id: d.activity_id,
        percentage: d.percentage / 100 // Guardamos como decimal 0.XX
      }));

    try {
      await this.allocationService.saveResourceDistributions(distributionsToSave);
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
