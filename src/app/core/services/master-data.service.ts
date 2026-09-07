import { Injectable, inject, signal } from '@angular/core';
import { PeriodService } from './period.service';
import { SupabaseService } from './supabase.service';

export interface Resource {
  id?: string;
  name: string;
  total_cost: number;
}

export interface Activity {
  id?: string;
  name: string;
}

export interface CostObject {
  id?: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {
  private supabase = inject(SupabaseService);
  private periods = inject(PeriodService);

  // Signals para el manejo del estado local (alta performance)
  resources = signal<Resource[]>([]);
  activities = signal<Activity[]>([]);
  costObjects = signal<CostObject[]>([]);
  
  loadingResources = signal<boolean>(false);
  loadingActivities = signal<boolean>(false);
  loadingCostObjects = signal<boolean>(false);

  // --- RECURSOS ---
  async loadResources() {
    this.loadingResources.set(true);
    this.resources.set([]);
    try {
      const period = await this.periods.ready();
      const { data, error } = await this.supabase.client.from('resources').select('*').eq('period_id', period.id).order('created_at');
      if (error) throw error;
      if (this.periods.current()?.id === period.id) this.resources.set(data || []);
    } finally { this.loadingResources.set(false); }
  }

  async addResource(resource: Resource) {
    if (!resource.name.trim()) throw new Error('El nombre es obligatorio');
    const period = await this.periods.ready();
    const { data, error } = await this.supabase.client.from('resources').insert([{ ...resource, name: resource.name.trim(), company_id: period.company_id, period_id: period.id }]).select();
    if (error) throw error;
    if (data?.length && this.periods.current()?.id === period.id) {
      this.resources.update(res => [...res, data[0]]);
    }
  }

  async deleteResource(id: string) {
    const { error } = await this.supabase.client.from('resources').delete().eq('id', id);
    if (error) throw error;
    this.resources.update(res => res.filter(r => r.id !== id));
  }

  // --- ACTIVIDADES ---
  async loadActivities() {
    this.loadingActivities.set(true);
    this.activities.set([]);
    try {
      const period = await this.periods.ready();
      const { data, error } = await this.supabase.client.from('activities').select('*').eq('period_id', period.id).order('created_at');
      if (error) throw error;
      if (this.periods.current()?.id === period.id) this.activities.set(data || []);
    } finally { this.loadingActivities.set(false); }
  }

  async addActivity(activity: Activity) {
    if (!activity.name.trim()) throw new Error('El nombre es obligatorio');
    const period = await this.periods.ready();
    const { data, error } = await this.supabase.client.from('activities').insert([{ ...activity, name: activity.name.trim(), company_id: period.company_id, period_id: period.id }]).select();
    if (error) throw error;
    if (data?.length && this.periods.current()?.id === period.id) {
      this.activities.update(act => [...act, data[0]]);
    }
  }

  async deleteActivity(id: string) {
    const { error } = await this.supabase.client.from('activities').delete().eq('id', id);
    if (error) throw error;
    this.activities.update(act => act.filter(a => a.id !== id));
  }

  // --- OBJETOS DE COSTO (Productos/Servicios) ---
  async loadCostObjects() {
    this.loadingCostObjects.set(true);
    this.costObjects.set([]);
    try {
      const period = await this.periods.ready();
      const { data, error } = await this.supabase.client.from('cost_objects').select('*').eq('period_id', period.id).order('created_at');
      if (error) throw error;
      if (this.periods.current()?.id === period.id) this.costObjects.set(data || []);
    } finally { this.loadingCostObjects.set(false); }
  }

  async addCostObject(costObject: CostObject) {
    if (!costObject.name.trim()) throw new Error('El nombre es obligatorio');
    const period = await this.periods.ready();
    const { data, error } = await this.supabase.client.from('cost_objects').insert([{ ...costObject, name: costObject.name.trim(), company_id: period.company_id, period_id: period.id }]).select();
    if (error) throw error;
    if (data?.length && this.periods.current()?.id === period.id) {
      this.costObjects.update(co => [...co, data[0]]);
    }
  }

  async deleteCostObject(id: string) {
    const { error } = await this.supabase.client.from('cost_objects').delete().eq('id', id);
    if (error) throw error;
    this.costObjects.update(co => co.filter(c => c.id !== id));
  }
}
