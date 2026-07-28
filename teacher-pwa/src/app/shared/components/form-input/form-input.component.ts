import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
})
export class FormInputComponent {
  id = input<string>('');
  name = input<string>('');
  label = input<string>('');
  placeholder = input<string>('');
  type = input<'text' | 'email' | 'password' | 'tel' | 'number'>('text');
  required = input<boolean>(false);
  autocomplete = input<string>('off');
  maxlength = input<number | undefined>(undefined);
  inputmode = input<string | undefined>(undefined);
  readonly = input<boolean>(false);

  // Two-way binding value model
  value = model<string>('');

  // Password visibility toggle signal
  showPassword = signal<boolean>(false);

  // Computed actual input type
  get currentType(): string {
    if (this.type() === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }
}
