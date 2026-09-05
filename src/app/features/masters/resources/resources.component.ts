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
    this.masterData.loadResources();
  }

  get totalResourceCost(): number {
    return this.masterData.resources().reduce((total, resource) => total + Number(resource.total_cost || 0), 0);
  }

  async onSubmit() {
    if (this.resourceForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addResource(this.resourceForm.value);
        this.resourceForm.reset({ name: '', total_cost: 0 });
      } catch (error) {
        console.error('Error al agregar recurso', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteResource(id: string) {
    if(confirm('¿Estás seguro de eliminar este recurso?')) {
      try {
        await this.masterData.deleteResource(id);
      } catch (error) {
        console.error('Error al eliminar recurso', error);
      }
    }
  }
}
