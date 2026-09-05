import { Injectable, inject, signal } from '@angular/core';
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
    const { data, error } = await this.supabase.client.from('resources').select('*').order('created_at', { ascending: true });
    this.loadingResources.set(false);
    if (error) throw error;
    this.resources.set(data || []);
  }

  async addResource(resource: Resource) {
    const { data, error } = await this.supabase.client.from('resources').insert([resource]).select();
    if (error) throw error;
    if (data) {
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
    const { data, error } = await this.supabase.client.from('activities').select('*').order('created_at', { ascending: true });
    this.loadingActivities.set(false);
    if (error) throw error;
    this.activities.set(data || []);
  }

  async addActivity(activity: Activity) {
    const { data, error } = await this.supabase.client.from('activities').insert([activity]).select();
    if (error) throw error;
    if (data) {
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
    const { data, error } = await this.supabase.client.from('cost_objects').select('*').order('created_at', { ascending: true });
    this.loadingCostObjects.set(false);
    if (error) throw error;
    this.costObjects.set(data || []);
  }

  async addCostObject(costObject: CostObject) {
    const { data, error } = await this.supabase.client.from('cost_objects').insert([costObject]).select();
    if (error) throw error;
    if (data) {
      this.costObjects.update(co => [...co, data[0]]);
    }
  }

  async deleteCostObject(id: string) {
    const { error } = await this.supabase.client.from('cost_objects').delete().eq('id', id);
    if (error) throw error;
    this.costObjects.update(co => co.filter(c => c.id !== id));
  }
}
