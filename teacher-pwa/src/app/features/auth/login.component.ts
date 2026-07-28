import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoginPayload } from '../../models/user.model';
import { AlertMessageComponent } from '../../shared/components/alert-message/alert-message.component';
import { FormInputComponent } from '../../shared/components/form-input/form-input.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertMessageComponent, FormInputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly authService = inject(AuthService);

  readonly authMode = signal<'signin' | 'signup'>('signin');
  readonly activeTab = signal<'email' | 'phone'>('email');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly rememberMe = signal(true);
  readonly capsLockOn = signal(false);
  readonly guardianCertified = signal(false);
  readonly studentLinkCode = signal('');

  // Google Account SSO Panel signals & models
  readonly showGooglePanel = signal(false);
  readonly selectedGooglePreset = signal<'parent' | 'teacher' | 'student' | 'custom'>('parent');
  readonly googleAccountRole = signal<'parent' | 'student'>('parent');
  customGoogleEmail = '';
  customGoogleName = '';

  // Form input models
  nameInput = '';
  emailInput = '';
  passwordInput = '';
  phoneInput = '';
  pinInput = '';

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const preferred = localStorage.getItem('preferred_auth_method');
      if (preferred === 'phone' || preferred === 'email') {
        this.activeTab.set(preferred);
      }
    }
  }

  toggleRememberMe(): void {
    this.rememberMe.update((v) => !v);
  }

  toggleGuardianCertification(): void {
    this.guardianCertified.update((v) => !v);
    if (this.guardianCertified()) {
      this.errorMessage.set('');
    }
  }

  checkCapsLock(event: KeyboardEvent): void {
    if (event.getModifierState) {
      this.capsLockOn.set(event.getModifierState('CapsLock'));
    }
  }

  switchMode(mode: 'signin' | 'signup'): void {
    this.authMode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  switchTab(tab: 'email' | 'phone'): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('preferred_auth_method', tab);
    }
  }

  openGooglePanel(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.authMode() === 'signup') {
      this.googleAccountRole.set('parent');
      this.selectedGooglePreset.set('parent');
    } else {
      this.selectedGooglePreset.set('teacher');
    }
    this.showGooglePanel.set(true);
  }

  closeGooglePanel(): void {
    this.showGooglePanel.set(false);
    this.errorMessage.set('');
  }

  selectGooglePreset(preset: 'parent' | 'teacher' | 'student' | 'custom'): void {
    this.selectedGooglePreset.set(preset);
    this.errorMessage.set('');
  }

  completeGoogleAuth(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.authMode() === 'signup') {
      if (!this.guardianCertified()) {
        this.errorMessage.set(
          'Please check the box certifying you are the adult legal guardian (18+ yrs) before completing Google sign-up.',
        );
        this.isLoading.set(false);
        return;
      }

      this.authService
        .registerWithGoogle(
          this.googleAccountRole(),
          undefined,
          this.studentLinkCode() || undefined,
          this.guardianCertified(),
        )
        .subscribe({
          next: (res) => {
            this.isLoading.set(false);
            this.showGooglePanel.set(false);
            this.successMessage.set(
              'Google account registration successful! Redirecting to portal...',
            );
            this.authService.redirectBasedOnRole(res.user.role);
          },
          error: (err: unknown) => {
            this.isLoading.set(false);
            const backendMsg = this.extractErrorMessage(err);
            this.errorMessage.set(
              backendMsg || 'Google registration failed. Please check inputs and try again.',
            );
            console.error('Google registration error:', err);
          },
        });
      return;
    }

    const providerHint =
      this.selectedGooglePreset() === 'custom'
        ? this.customGoogleEmail || 'google'
        : this.selectedGooglePreset();

    this.authService.loginWithGoogle(undefined, providerHint).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showGooglePanel.set(false);
        this.authService.redirectBasedOnRole(res.user.role);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        const backendMsg = this.extractErrorMessage(err);
        this.errorMessage.set(
          backendMsg ||
            'Failed to authenticate with Google Account. Ensure your account is registered.',
        );
        console.error('Google login error:', err);
      },
    });
  }

  onGoogleSignIn(): void {
    this.openGooglePanel();
  }

  private extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object') {
      const httpErr = err as { error?: { message?: string }; message?: string };
      if (httpErr.error?.message) return httpErr.error.message;
      if (httpErr.message) return httpErr.message;
    }
    return '';
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.authMode() === 'signup') {
      this.handleSignUp();
      return;
    }

    const identifier = this.activeTab() === 'email' ? this.emailInput : this.phoneInput;
    const secret = this.activeTab() === 'email' ? this.passwordInput : this.pinInput;

    if (!identifier || identifier.trim() === '') {
      this.errorMessage.set(
        `Please enter your ${this.activeTab() === 'email' ? 'Email address' : 'Phone number'}.`,
      );
      this.isLoading.set(false);
      return;
    }

    if (this.activeTab() === 'phone' && (!this.pinInput || this.pinInput.length < 4)) {
      this.errorMessage.set('Please enter your 4-digit PIN code.');
      this.isLoading.set(false);
      return;
    }

    const payload: LoginPayload =
      this.activeTab() === 'email'
        ? {
            loginType: 'email',
            email: identifier,
            password: secret || '',
          }
        : {
            loginType: 'phone',
            phoneNumber: identifier,
            pin: secret || '',
          };

    this.authService.login(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set('Invalid credentials or account not found.');
        console.error('Login error:', err);
      },
    });
  }

  private handleSignUp(): void {
    const role = 'parent';
    if (!this.nameInput || this.nameInput.trim() === '') {
      this.errorMessage.set('Please enter your full name.');
      this.isLoading.set(false);
      return;
    }

    if (!this.guardianCertified()) {
      this.errorMessage.set(
        'Please check the box certifying you are the legal adult guardian (18+) of the student before registering.',
      );
      this.isLoading.set(false);
      return;
    }

    const identifier = this.activeTab() === 'email' ? this.emailInput : this.phoneInput;
    const secret = this.activeTab() === 'email' ? this.passwordInput : this.pinInput;

    if (!identifier || identifier.trim() === '') {
      this.errorMessage.set(
        `Please enter a valid ${this.activeTab() === 'email' ? 'Email address' : 'Phone number'}.`,
      );
      this.isLoading.set(false);
      return;
    }

    this.authService
      .registerPublicUser(role, {
        name: this.nameInput,
        identifier: identifier,
        secret: secret || '',
        role: role,
        studentLinkCode: this.studentLinkCode() || undefined,
        guardianCertified: this.guardianCertified(),
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.successMessage.set('Account registration successful! You may now log in.');
          this.authMode.set('signin');
        },
        error: (err: unknown) => {
          this.isLoading.set(false);
          this.errorMessage.set('Registration failed. Please check your inputs.');
          console.error('Registration error:', err);
        },
      });
  }
}
