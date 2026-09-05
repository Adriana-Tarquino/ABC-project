import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ResourceDistribution {
  resource_id: string;
  activity_id: string;
  percentage: number;
}

export interface ActivityDistribution {
  activity_id: string;
  cost_object_id: string;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class AllocationService {
  private supabase = inject(SupabaseService);

  // Guardar asignaciones de Recursos a Actividades
  async saveResourceDistributions(distributions: ResourceDistribution[]) {
    // Primero, limpiamos las distribuciones existentes para estos recursos para evitar duplicados
    const resourceIds = [...new Set(distributions.map(d => d.resource_id))];
    if (resourceIds.length > 0) {
      await this.supabase.client.from('resource_distributions').delete().in('resource_id', resourceIds);
    }
    
    // Insertamos las nuevas
    if (distributions.length > 0) {
      const { error } = await this.supabase.client.from('resource_distributions').insert(distributions);
      if (error) throw error;
    }
  }

  // Guardar asignaciones de Actividades a Objetos de Costo
  async saveActivityDistributions(distributions: ActivityDistribution[]) {
    const activityIds = [...new Set(distributions.map(d => d.activity_id))];
    if (activityIds.length > 0) {
      await this.supabase.client.from('activity_distributions').delete().in('activity_id', activityIds);
    }
    
    if (distributions.length > 0) {
      const { error } = await this.supabase.client.from('activity_distributions').insert(distributions);
      if (error) throw error;
    }
  }

  // Ejecutar el motor de cálculo ABC (Llama a la función RPC de Postgres)
  async executeCalculation(periodId: string) {
    const { data, error } = await this.supabase.client.rpc('calculate_abc_period', {
      p_period_id: periodId
    });
    
    if (error) throw error;
    return data;
  }
}
