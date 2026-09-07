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
  selector: 'app-cost-objects',
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
  templateUrl: './cost-objects.component.html',
  styleUrls: ['./cost-objects.component.css']
})
export class CostObjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private feedback = inject(FeedbackService);
  public masterData = inject(MasterDataService);

  costObjectForm: FormGroup;
  displayedColumns: string[] = ['name', 'actions'];
  isSubmitting = false;

  constructor() {
    this.costObjectForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.masterData.loadCostObjects().catch(() => this.feedback.error('No se pudieron cargar los datos. Comprueba la conexión y la configuración.', 'No pudimos cargar los productos'));
  }

  async onSubmit() {
    if (this.isSubmitting) return;
    if (this.costObjectForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addCostObject(this.costObjectForm.value);
        this.costObjectForm.reset({ name: '' });
        this.feedback.success('El producto o servicio ya está disponible para recibir el costo final del modelo ABC.', 'Producto agregado');
      } catch (error) {
        console.error('Error al agregar objeto de costo', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos agregar el producto');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteCostObject(id: string) {
    if (await this.feedback.confirm('Se eliminará el producto o servicio y sus asignaciones relacionadas dentro del período actual. Esta acción no se puede deshacer.', '¿Eliminar este producto?', 'Eliminar producto')) {
      try {
        await this.masterData.deleteCostObject(id);
        this.feedback.success('El producto o servicio y sus asignaciones relacionadas fueron eliminados del período actual.', 'Producto eliminado');
      } catch (error) {
        console.error('Error al eliminar objeto de costo', error);
        this.feedback.error('No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.', 'No pudimos eliminar el producto');
      }
    }
  }
}
