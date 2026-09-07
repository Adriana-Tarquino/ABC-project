import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { SupabaseService } from '../../../core/services/supabase.service';

describe('LoginComponent', () => {
  let signIn: jasmine.Spy;
  let signUp: jasmine.Spy;
  beforeEach(async () => {
    signIn = jasmine.createSpy('signIn').and.resolveTo({ data: {}, error: new Error('Invalid login credentials') });
    signUp = jasmine.createSpy('signUp').and.resolveTo({ data: {}, error: null });
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideNoopAnimations(), {
        provide: SupabaseService, useValue: { currentUser$: of(null), signIn, signUp }
      }]
    }).compileComponents();
  });
  it('shows an invalid login without silently registering an account', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({ email: 'test@example.com', password: 'secret123' });
    await fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signUp).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Invalid login credentials');
  });
  it('registers only when explicitly selected and explains email confirmation', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.registering = true;
    fixture.componentInstance.loginForm.setValue({ email: 'test@example.com', password: 'secret123' });
    await fixture.componentInstance.onSubmit();
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.message).toContain('confirmar');
  });
});
