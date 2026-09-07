import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PeriodService } from './period.service';
import { SupabaseService } from './supabase.service';

describe('PeriodService', () => {
  let service: PeriodService;
  let users: BehaviorSubject<{ id: string } | null>;
  let rpc: jasmine.Spy;
  const period = { id: 'period-1', company_id: 'company-1', name: '2026-08' };
  beforeEach(() => {
    users = new BehaviorSubject<{ id: string } | null>({ id: 'user-1' });
    rpc = jasmine.createSpy('rpc').and.resolveTo({ data: period, error: null });
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: { currentUser$: users, client: { rpc } } }] });
    service = TestBed.inject(PeriodService);
  });
  it('retains the selected period during token refresh', async () => {
    await service.open('2026-08');
    users.next({ id: 'user-1' });
    expect(await service.ready()).toEqual(period);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('clears another user’s selected period', async () => {
    await service.open('2026-08');
    users.next({ id: 'user-2' });
    expect(service.current()).toBeNull();
  });
  it('rejects invalid months without contacting the database', async () => {
    await expectAsync(service.open('2026-13')).toBeRejected();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('discards a response that arrives after the account changes', async () => {
    let resolve!: (result: unknown) => void;
    rpc.and.returnValue(new Promise(done => resolve = done));
    const opening = service.open('2026-08');
    users.next({ id: 'user-2' });
    resolve({ data: period, error: null });
    await expectAsync(opening).toBeRejected();
    expect(service.current()).toBeNull();
  });
});
