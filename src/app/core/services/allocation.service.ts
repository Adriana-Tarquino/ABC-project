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

type AllocationKind = 'resource' | 'activity';

@Injectable({
  providedIn: 'root'
})
export class AllocationService {
  private supabase = inject(SupabaseService);

  async saveResourceDistributions(distributions: ResourceDistribution[], sourceId: string) {
    await this.save('resource', sourceId, distributions);
  }
  async saveActivityDistributions(distributions: ActivityDistribution[], sourceId: string) {
    await this.save('activity', sourceId, distributions);
  }
  private async save(kind: string, source: string, rows: unknown[]) {
    const { error } = await this.supabase.client.rpc('save_abc_distributions', { p_kind: kind, p_source: source, p_rows: rows });
    if (error) throw error;
  }
  async loadDistributions(kind: 'resource' | 'activity', source: string) {
    const { data, error } = await this.supabase.client.from(kind + '_distributions').select('*').eq(kind + '_id', source);
    if (error) throw error;
    return data || [];
  }

  /** Totales guardados, expresados como porcentaje de 0 a 100, para orientar la selección del usuario. */
  async loadDistributionTotals(kind: AllocationKind, sourceIds: string[]): Promise<Record<string, number>> {
    if (!sourceIds.length) return {};

    const sourceColumn = kind + '_id';
    const { data, error } = await this.supabase.client
      .from(kind + '_distributions')
      .select(`${sourceColumn}, percentage`)
      .in(sourceColumn, sourceIds);
    if (error) throw error;

    const rows = (data || []) as Array<{ resource_id?: string; activity_id?: string; percentage?: number | string | null }>;
    const totals: Record<string, number> = {};
    for (const row of rows) {
      const id = kind === 'resource' ? row.resource_id : row.activity_id;
      if (!id) continue;
      totals[id] = (totals[id] || 0) + Number(row.percentage || 0) * 100;
    }
    for (const id of Object.keys(totals)) {
      totals[id] = Math.round(totals[id] * 100) / 100;
    }
    return totals;
  }

  /** Costo que una actividad ya recibió desde los recursos guardados del período actual. */
  async loadActivityPoolCost(activityId: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .from('resource_distributions')
      .select('percentage, resources(total_cost)')
      .eq('activity_id', activityId);
    if (error) throw error;

    const rows = (data || []) as Array<{ percentage?: number | string | null; resources?: { total_cost?: number | string | null } | null }>;
    return Math.round(rows.reduce((total, row) =>
      total + Number(row.percentage || 0) * Number(row.resources?.total_cost || 0), 0
    ) * 100) / 100;
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
