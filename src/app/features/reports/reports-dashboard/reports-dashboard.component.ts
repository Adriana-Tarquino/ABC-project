import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { SupabaseService } from '../../../core/services/supabase.service';
import { PeriodService } from '../../../core/services/period.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

@Component({
  selector: 'app-reports-dashboard', standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.css']
})
export class ReportsDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('productChart') productChartRef!: ElementRef;
  @ViewChild('activityChart') activityChartRef!: ElementRef;
  private supabase = inject(SupabaseService);
  private periods = inject(PeriodService);
  private changeDetector = inject(ChangeDetectorRef);
  private charts: echarts.ECharts[] = [];
  private observer?: ResizeObserver;
  private destroyed = false;
  loading = true;
  message = '';
  products: { name: string; value: number }[] = [];
  activities: { name: string; value: number }[] = [];
  get total() { return this.products.reduce((sum, row) => sum + row.value, 0); }
  get leadProduct() {
    return this.products.reduce<{ name: string; value: number } | null>((lead, product) =>
      !lead || product.value > lead.value ? product : lead, null);
  }

  productShare(value: number): number {
    return this.total ? Math.round(value / this.total * 10000) / 100 : 0;
  }

  async ngAfterViewInit() {
    try {
      const period = await this.periods.ready();
      const [products, activities] = await Promise.all([
        this.supabase.client.from('cost_objects').select('id, name').eq('period_id', period.id).order('created_at'),
        this.supabase.client.from('activities').select('id, name').eq('period_id', period.id).order('created_at')
      ]);
      if (products.error) throw products.error;
      if (activities.error) throw activities.error;
      const productRows = products.data || [];
      const activityRowsForPeriod = activities.data || [];
      if (!productRows.length || !activityRowsForPeriod.length) {
        this.message = 'El período no tiene actividades o productos suficientes para mostrar un resultado.';
        return;
      }

      // We already know the IDs belonging to the selected period. Filtering with
      // those IDs avoids PostgREST relation metadata, which was the source of the
      // failed query shown in the report.
      const [resourceAssignments, activityAssignments] = await Promise.all([
        this.supabase.client.from('resource_distributions')
          .select('activity_id, assigned_cost')
          .in('activity_id', activityRowsForPeriod.map(activity => activity.id)),
        this.supabase.client.from('activity_distributions')
          .select('cost_object_id, assigned_cost')
          .in('cost_object_id', productRows.map(product => product.id))
      ]);
      if (resourceAssignments.error) throw resourceAssignments.error;
      if (activityAssignments.error) throw activityAssignments.error;
      if (this.destroyed) return;

      const resourceRows = resourceAssignments.data || [];
      const activityRows = activityAssignments.data || [];
      const hasCurrentResults = resourceRows.length > 0 && activityRows.length > 0
        && [...resourceRows, ...activityRows].every(row => Number.isFinite(Number(row.assigned_cost)) && row.assigned_cost !== null);
      if (!hasCurrentResults) {
        this.message = 'No hay resultados vigentes para este período. Completa las asignaciones y ejecuta el cálculo ABC.';
        return;
      }

      const productCosts = this.sumById(activityRows, 'cost_object_id');
      const activityCosts = this.sumById(resourceRows, 'activity_id');
      this.products = this.withUniqueNames(productRows.map(product => ({
        id: product.id,
        name: product.name,
        value: productCosts[product.id] || 0
      })));
      this.activities = this.withUniqueNames(activityRowsForPeriod.map(activity => ({
        id: activity.id,
        name: activity.name,
        value: activityCosts[activity.id] || 0
      }))).sort((a, b) => b.value - a.value);

      // The chart elements live behind *ngIf. Render them before accessing their
      // ViewChild references; otherwise they are still undefined on first load.
      this.loading = false;
      this.changeDetector.detectChanges();
      if (!this.productChartRef || !this.activityChartRef || this.destroyed) return;

      const productChart = echarts.init(this.productChartRef.nativeElement);
      const activityChart = echarts.init(this.activityChartRef.nativeElement);
      this.charts = [productChart, activityChart];
      productChart.setOption({
        color: ['#0f766e','#2563eb','#b7791f','#7c3aed'], tooltip: { trigger: 'item', renderMode: 'richText' },
        legend: { bottom: 0 }, series: [{ name: 'Costo final', type: 'pie', radius: ['42%','68%'], center: ['50%','45%'], data: this.products }]
      });
      activityChart.setOption({
        color: ['#0f766e'], tooltip: { trigger: 'axis', renderMode: 'richText' }, grid: { containLabel: true, left: 20, right: 20, bottom: 60 },
        xAxis: { type: 'category', data: this.activities.map(a => a.name), axisLabel: { rotate: 20 } },
        yAxis: { type: 'value' }, series: [{ type: 'bar', data: this.activities.map(a => a.value), barMaxWidth: 42 }]
      });
      this.observer = new ResizeObserver(() => this.charts.forEach(chart => chart.resize()));
      this.observer.observe(this.productChartRef.nativeElement);
      this.observer.observe(this.activityChartRef.nativeElement);
    } catch (error: any) {
      console.error('Error al cargar reportes ABC', error);
      if (!this.destroyed) this.message = this.reportErrorMessage(error);
    }
    finally { if (!this.destroyed) this.loading = false; }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    this.charts.forEach(chart => chart.dispose());
  }

  private sumById(rows: Array<{ assigned_cost: number | string | null; activity_id?: string; cost_object_id?: string }>, idField: 'activity_id' | 'cost_object_id') {
    return rows.reduce<Record<string, number>>((totals, row) => {
      const id = row[idField];
      if (id) totals[id] = (totals[id] || 0) + Number(row.assigned_cost || 0);
      return totals;
    }, {});
  }

  /** Chart libraries use the name as an identifier. Preserve distinct records with equal labels. */
  private withUniqueNames(rows: Array<{ id: string; name: string; value: number }>): { name: string; value: number }[] {
    const occurrences = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.name] = (counts[row.name] || 0) + 1;
      return counts;
    }, {});
    const seen: Record<string, number> = {};
    return rows.map(row => {
      seen[row.name] = (seen[row.name] || 0) + 1;
      const name = occurrences[row.name] > 1 ? `${row.name} (${seen[row.name]})` : row.name;
      return { name, value: Math.round((row.value + Number.EPSILON) * 100) / 100 };
    });
  }

  private reportErrorMessage(error: { message?: string; code?: string } | undefined): string {
    const detail = error?.message || '';
    if (error?.code === 'PGRST202' || /relationship|schema cache/i.test(detail)) {
      return 'Supabase no reconoció una relación de datos. Actualiza la aplicación y vuelve a abrir Reportes.';
    }
    return detail ? `No se pudieron cargar los resultados: ${detail}` : 'No se pudieron cargar los resultados. Vuelve a abrir Reportes para reintentar.';
  }
}
