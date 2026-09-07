import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ResourceAllocationComponent } from './resource-allocation.component';
import { MasterDataService } from '../../../core/services/master-data.service';
import { AllocationService } from '../../../core/services/allocation.service';

describe('ResourceAllocationComponent', () => {
  it('restores decimal percentages and clears saved assignments when all are zero', async () => {
    const save = jasmine.createSpy('save').and.resolveTo(undefined);
    await TestBed.configureTestingModule({
      imports: [ResourceAllocationComponent],
      providers: [provideNoopAnimations(), {
        provide: MasterDataService, useValue: {
          loadResources: async () => {}, loadActivities: async () => {},
          resources: signal([{ id: 'r', name: 'Recurso', total_cost: 100 }]),
          activities: signal([{ id: 'a', name: 'Actividad' }])
        }
      }, {
        provide: AllocationService, useValue: {
          loadDistributions: async () => [{ activity_id: 'a', percentage: 0.3334 }],
          saveResourceDistributions: save
        }
      }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ResourceAllocationComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.allocationForm.get('resource_id')!.setValue('r');
    await fixture.whenStable();
    expect(component.distributionsArray.at(0).value.percentage).toBe(33.34);
    expect(component.allocationForm.valid).toBeTrue();
    await component.onSubmit();
    expect(save).toHaveBeenCalledWith([{ resource_id: 'r', activity_id: 'a', percentage: 0.3334 }], 'r');
    component.allocationForm.get('resource_id')!.setValue('r');
    await fixture.whenStable();
    component.distributionsArray.at(0).get('percentage')!.setValue(0);
    await component.onSubmit();
    expect(save).toHaveBeenCalledWith([], 'r');
  });
});
