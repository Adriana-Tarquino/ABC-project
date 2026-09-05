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
    this.masterData.loadCostObjects();
  }

  async onSubmit() {
    if (this.costObjectForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addCostObject(this.costObjectForm.value);
        this.costObjectForm.reset({ name: '' });
      } catch (error) {
        console.error('Error al agregar objeto de costo', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteCostObject(id: string) {
    if(confirm('¿Estás seguro de eliminar este objeto de costo?')) {
      try {
        await this.masterData.deleteCostObject(id);
      } catch (error) {
        console.error('Error al eliminar objeto de costo', error);
      }
    }
  }
}
