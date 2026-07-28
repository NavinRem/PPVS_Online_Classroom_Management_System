import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UserProfile, LoginPayload, AuthResponse, UserRole } from '../../models/user.model';
import { environment } from '../config/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  demoLogin(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user_profile';

  readonly currentUser = signal<UserProfile | null>(this.loadUserFromStorage());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role || null);

  private loadUserFromStorage(): UserProfile | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const saved = localStorage.getItem(this.USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as UserProfile;
    } catch {
      return null;
    }
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => this.handleSuccessfulLogin(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }

  // Google SSO login that checks if the email is registered in system
  loginWithGoogle(idToken?: string, provider?: string): Observable<AuthResponse> {
    const payload = {
      idToken: idToken || 'mock_google_oauth_id_token',
      provider: provider || 'google',
    };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login-google`, payload).pipe(
      tap((response) => this.handleSuccessfulLogin(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }

  // Public sign-up strictly for Parent and Student roles (No teachers/admins allowed)
  registerPublicUser(
    role: 'parent' | 'student',
    payload: Record<string, unknown>,
  ): Observable<AuthResponse> {
    const endpoint = `${environment.apiUrl}/auth/register-${role}`;
    return this.http.post<AuthResponse>(endpoint, payload).pipe(
      tap((response) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        }
        this.currentUser.set(response.user);
        if (response.user.role === 'teacher' || response.user.role === 'admin') {
          this.redirectBasedOnRole(response.user.role);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }

  // Google SSO sign-up strictly for Parent and Student roles with verification guardrails
  registerWithGoogle(
    role: 'parent' | 'student',
    idToken?: string,
    studentLinkCode?: string,
    guardianCertified?: boolean,
  ): Observable<AuthResponse> {
    const payload = {
      idToken: idToken || 'mock_google_oauth_id_token',
      role,
      studentLinkCode: studentLinkCode || undefined,
      guardianCertified: !!guardianCertified,
    };
    const endpoint = `${environment.apiUrl}/auth/register-google`;
    return this.http.post<AuthResponse>(endpoint, payload).pipe(
      tap((response) => this.handleSuccessfulLogin(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
    );
  }

  private handleSuccessfulLogin(response: AuthResponse): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, response.accessToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    }
    this.currentUser.set(response.user);
    this.redirectBasedOnRole(response.user.role);
  }

  redirectBasedOnRole(role: UserRole): void {
    switch (role) {
      case 'teacher':
        this.router.navigate(['/teacher/dashboard']);
        break;
      case 'parent':
        this.router.navigate(['/parent/dashboard']);
        break;
      case 'student':
        this.router.navigate(['/student/dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
