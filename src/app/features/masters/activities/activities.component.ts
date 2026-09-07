import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MasterDataService } from '../../../core/services/master-data.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css']
})
export class ActivitiesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private feedback = inject(FeedbackService);
  public masterData = inject(MasterDataService);

  activityForm: FormGroup;
  displayedColumns: string[] = ['name', 'actions'];
  isSubmitting = false;

  constructor() {
    this.activityForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.masterData.loadActivities().catch(() => this.feedback.error('No se pudieron cargar los datos. Comprueba la conexión y la configuración.', 'No pudimos cargar las actividades'));
  }

  async onSubmit() {
    if (this.isSubmitting) return;
    if (this.activityForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addActivity(this.activityForm.value);
        this.activityForm.reset({ name: '' });
        this.feedback.success('La actividad ya está disponible para recibir recursos y repartir su costo entre productos.', 'Actividad agregada');
      } catch (error) {
        console.error('Error al agregar actividad', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos agregar la actividad');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteActivity(id: string) {
    if (await this.feedback.confirm('Se eliminará la actividad y sus asignaciones relacionadas dentro del período actual. Esta acción no se puede deshacer.', '¿Eliminar esta actividad?', 'Eliminar actividad')) {
      try {
        await this.masterData.deleteActivity(id);
        this.feedback.success('La actividad y sus asignaciones relacionadas fueron eliminadas del período actual.', 'Actividad eliminada');
      } catch (error) {
        console.error('Error al eliminar actividad', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos eliminar la actividad');
      }
    }
  }
}
