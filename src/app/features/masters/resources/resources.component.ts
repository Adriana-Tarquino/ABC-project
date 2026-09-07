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
  selector: 'app-resources',
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
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.css']
})
export class ResourcesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private feedback = inject(FeedbackService);
  public masterData = inject(MasterDataService);

  resourceForm: FormGroup;
  displayedColumns: string[] = ['name', 'total_cost', 'actions'];
  isSubmitting = false;

  constructor() {
    this.resourceForm = this.fb.group({
      name: ['', Validators.required],
      total_cost: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.masterData.loadResources().catch(() => this.feedback.error('No se pudieron cargar los datos. Comprueba la conexión y la configuración.', 'No pudimos cargar los recursos'));
  }

  get totalResourceCost(): number {
    return this.masterData.resources().reduce((total, resource) => total + Number(resource.total_cost || 0), 0);
  }

  async onSubmit() {
    if (this.isSubmitting) return;
    if (this.resourceForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addResource(this.resourceForm.value);
        this.resourceForm.reset({ name: '', total_cost: 0 });
        this.feedback.success('El recurso ya forma parte del período actual y está listo para distribuirse entre actividades.', 'Recurso agregado');
      } catch (error) {
        console.error('Error al agregar recurso', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos agregar el recurso');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteResource(id: string) {
    if (await this.feedback.confirm('Se eliminará el recurso y sus asignaciones relacionadas dentro del período actual. Esta acción no se puede deshacer.', '¿Eliminar este recurso?', 'Eliminar recurso')) {
      try {
        await this.masterData.deleteResource(id);
        this.feedback.success('El recurso y sus asignaciones relacionadas fueron eliminados del período actual.', 'Recurso eliminado');
      } catch (error) {
        console.error('Error al eliminar recurso', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos eliminar el recurso');
      }
    }
  }
}
