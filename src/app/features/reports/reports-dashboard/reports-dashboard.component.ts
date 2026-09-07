import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
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
        this.supabase.client.from('cost_objects').select('id, name, activity_distributions(assigned_cost)').eq('period_id', period.id),
        this.supabase.client.from('activities').select('id, name, resource_distributions(assigned_cost)').eq('period_id', period.id)
      ]);
      if (products.error) throw products.error;
      if (activities.error) throw activities.error;
      if (this.destroyed) return;
      const allRows = [...(products.data || []).flatMap(p => p.activity_distributions), ...(activities.data || []).flatMap(a => a.resource_distributions)];
      if (!allRows.length || allRows.some(row => row.assigned_cost === null)) {
        this.message = 'No hay resultados vigentes para este período. Completa las asignaciones y ejecuta el cálculo ABC.';
        return;
      }
      this.products = (products.data || []).map(p => ({ name: p.name, value: p.activity_distributions.reduce((sum, d) => sum + Number(d.assigned_cost), 0) }));
      this.activities = (activities.data || []).map(a => ({ name: a.name, value: a.resource_distributions.reduce((sum, d) => sum + Number(d.assigned_cost), 0) })).sort((a,b) => b.value-a.value);
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
    } catch { if (!this.destroyed) this.message = 'No se pudieron cargar los resultados. Vuelve a abrir Reportes para reintentar.'; }
    finally { if (!this.destroyed) this.loading = false; }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    this.charts.forEach(chart => chart.dispose());
  }
}
