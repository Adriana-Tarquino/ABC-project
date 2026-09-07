import { TestBed } from '@angular/core/testing';
import { AllocationService } from './allocation.service';
import { SupabaseService } from './supabase.service';

describe('AllocationService', () => {
  let service: AllocationService;
  let rpc: jasmine.Spy;
  beforeEach(() => {
    rpc = jasmine.createSpy('rpc').and.resolveTo({ error: null });
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }] });
    service = TestBed.inject(AllocationService);
  });
  it('clears all resource assignments transactionally with an explicit source', async () => {
    await service.saveResourceDistributions([], 'resource-1');
    expect(rpc).toHaveBeenCalledOnceWith('save_abc_distributions', { p_kind: 'resource', p_source: 'resource-1', p_rows: [] });
  });
  it('propagates a failed save instead of reporting success', async () => {
    const error = new Error('Save failed');
    rpc.and.resolveTo({ error });
    await expectAsync(service.saveActivityDistributions([], 'activity-1')).toBeRejectedWith(error);
  });
  it('calculates the selected period', async () => {
    await service.executeCalculation('period-2');
    expect(rpc).toHaveBeenCalledOnceWith('calculate_abc_period', { p_period_id: 'period-2' });
  });
});
