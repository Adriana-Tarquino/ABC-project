import { Component, Injectable, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type FeedbackKind = 'success' | 'info' | 'warning' | 'error';

interface FeedbackData {
  kind: FeedbackKind;
  message: string;
  title?: string;
}

interface ConfirmationData {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <section class="feedback-dialog-body feedback-{{ data.kind }}" [attr.aria-label]="title">
      <button mat-icon-button type="button" class="feedback-close" (click)="close()" aria-label="Cerrar mensaje">
        <mat-icon>close</mat-icon>
      </button>
      <div class="feedback-icon"><mat-icon>{{ icon }}</mat-icon></div>
      <div class="feedback-copy">
        <span class="feedback-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p>{{ data.message }}</p>
      </div>
      <div class="feedback-actions">
        <button mat-raised-button color="primary" type="button" (click)="close()">Entendido</button>
      </div>
    </section>
  `
})
export class FeedbackDialogComponent {
  readonly data = inject<FeedbackData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FeedbackDialogComponent>);

  get icon() {
    return { success: 'check_circle', info: 'info', warning: 'warning_amber', error: 'error_outline' }[this.data.kind];
  }

  get eyebrow() {
    return { success: 'Operación completada', info: 'Información', warning: 'Revisión necesaria', error: 'No se pudo completar' }[this.data.kind];
  }

  get title() {
    return this.data.title || { success: 'Todo está listo', info: 'Ten en cuenta', warning: 'Antes de continuar', error: 'Ocurrió un inconveniente' }[this.data.kind];
  }

  close() { this.dialogRef.close(); }
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <section class="confirmation-dialog-body" [attr.aria-label]="data.title">
      <div class="confirmation-icon"><mat-icon>warning_amber</mat-icon></div>
      <div class="confirmation-copy">
        <span class="feedback-eyebrow">Confirmación requerida</span>
        <h2>{{ data.title }}</h2>
        <p>{{ data.message }}</p>
      </div>
      <div class="confirmation-actions">
        <button mat-button type="button" (click)="close(false)">Cancelar</button>
        <button mat-raised-button color="primary" type="button" (click)="close(true)">{{ data.confirmLabel }}</button>
      </div>
    </section>
  `
})
export class ConfirmationDialogComponent {
  readonly data = inject<ConfirmationData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);

  close(confirmed: boolean) { this.dialogRef.close(confirmed); }
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private dialog = inject(MatDialog);

  show(kind: FeedbackKind, message: string, title?: string) {
    return this.dialog.open(FeedbackDialogComponent, {
      ariaLabel: title || 'Mensaje de la aplicación',
      autoFocus: 'dialog',
      data: { kind, message, title },
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'feedback-dialog-panel',
      width: '440px'
    });
  }

  success(message: string, title?: string) { return this.show('success', message, title); }
  info(message: string, title?: string) { return this.show('info', message, title); }
  warning(message: string, title?: string) { return this.show('warning', message, title); }
  error(message: string, title?: string) { return this.show('error', message, title); }

  confirm(message: string, title = '¿Deseas continuar?', confirmLabel = 'Confirmar'): Promise<boolean> {
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      ariaLabel: title,
      autoFocus: 'dialog',
      data: { message, title, confirmLabel },
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'feedback-dialog-panel',
      width: '440px'
    });
    return new Promise(resolve => ref.afterClosed().subscribe(result => resolve(result === true)));
  }
}
