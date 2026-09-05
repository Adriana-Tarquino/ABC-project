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
    this.masterData.loadActivities();
  }

  async onSubmit() {
    if (this.activityForm.valid) {
      this.isSubmitting = true;
      try {
        await this.masterData.addActivity(this.activityForm.value);
        this.activityForm.reset({ name: '' });
      } catch (error) {
        console.error('Error al agregar actividad', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async deleteActivity(id: string) {
    if(confirm('¿Estás seguro de eliminar esta actividad?')) {
      try {
        await this.masterData.deleteActivity(id);
      } catch (error) {
        console.error('Error al eliminar actividad', error);
      }
    }
  }
}
