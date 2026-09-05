import { Component, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';
import { SupabaseService } from '../../../core/services/supabase.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.css']
})
export class ReportsDashboardComponent implements AfterViewInit {
  @ViewChild('productChart') productChartRef!: ElementRef;
  @ViewChild('activityChart') activityChartRef!: ElementRef;

  private supabase = inject(SupabaseService);

  ngAfterViewInit(): void {
    // Inicializar gráficos después de que la vista cargue
    setTimeout(() => {
      this.initProductChart();
      this.initActivityChart();
    }, 100);
  }

  async initProductChart() {
    const chart = echarts.init(this.productChartRef.nativeElement);
    
    // Obtener datos reales de Supabase (Agrupación de costos por producto)
    // Para simplificar la demo si no hay datos, usamos datos simulados.
    const { data, error } = await this.supabase.client
      .from('activity_distributions')
      .select('assigned_cost, cost_objects(name)');

    let chartData = [];
    if (!error && data && data.length > 0) {
      // Agrupar y sumar
      const grouped = data.reduce((acc: any, curr: any) => {
        const name = curr.cost_objects?.name || 'Desconocido';
        acc[name] = (acc[name] || 0) + (curr.assigned_cost || 0);
        return acc;
      }, {});
      chartData = Object.keys(grouped).map(key => ({ name: key, value: grouped[key] }));
    } else {
      // Datos simulados (Mock)
      chartData = [
        { name: 'Producto A', value: 7900 },
        { name: 'Producto B', value: 7100 },
        { name: 'Producto C', value: 3500 }
      ];
    }

    const option = {
      color: ['#0f766e', '#2563eb', '#b7791f', '#7c3aed', '#17803f'],
      tooltip: {
        trigger: 'item',
        formatter: '{a}<br/>{b}: ${c} ({d}%)',
        borderWidth: 0,
        padding: 12,
        textStyle: { color: '#172033' }
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemGap: 18,
        textStyle: { color: '#64748b', fontWeight: 600 }
      },
      series: [
        {
          name: 'Costo Final',
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '45%'],
          data: chartData,
          label: { color: '#334155', fontWeight: 700 },
          emphasis: {
            itemStyle: {
              shadowBlur: 16,
              shadowOffsetX: 0,
              shadowColor: 'rgba(15, 23, 42, 0.18)'
            }
          }
        }
      ]
    };

    chart.setOption(option);
  }

  async initActivityChart() {
    const chart = echarts.init(this.activityChartRef.nativeElement);
    
    // Mock de datos para el costo de actividades
    const chartData = {
      categories: ['Preparar Máquinas', 'Control de Calidad', 'Logística'],
      values: [9500, 5500, 3200]
    };

    const option = {
      color: ['#0f766e'],
      grid: { top: 24, right: 16, bottom: 44, left: 62 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        borderWidth: 0,
        padding: 12,
        textStyle: { color: '#172033' }
      },
      xAxis: {
        type: 'category',
        data: chartData.categories,
        axisLine: { lineStyle: { color: '#d9e2ec' } },
        axisLabel: { color: '#64748b', fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '${value}', color: '#64748b' },
        splitLine: { lineStyle: { color: '#edf2f7' } }
      },
      series: [
        {
          data: chartData.values,
          type: 'bar',
          barWidth: 42,
          itemStyle: { borderRadius: [8, 8, 0, 0] }
        }
      ]
    };

    chart.setOption(option);
  }
}
