# PPVS Classroom Management System — Authentication Architecture & Guide

This document details the architecture, design patterns, and end-to-end flow for **Email + Password** and **Phone + 4-Digit PIN** authentication across the **PPVS Online Classroom Management System** (NestJS Backend + Angular PWA / Web Frontend).

---

## 1. Architectural Overview

To accommodate parents, students, teachers, and school administrators in Cambodia without requiring external SMS gateway fees, the PPVS platform implements a **Dual-Mode Authentication Strategy** built on top of **Firebase Authentication** and **Google Cloud Firestore**:

1. **Standard Email + Password Authentication**: Used for traditional users and administrative staff (`user@example.com` + secure password).
2. **Phone Number + 4-Digit PIN Authentication**: Used primarily by parents and students (`012345678` + `1234`). To leverage Firebase Authentication's zero-cost email provider without requiring expensive SMS verification, phone numbers are dynamically anchored to a synthetic, highly secure domain: `@telegram.ppvs.edu.kh`.

```
[ Angular PWA Frontend ]
         │
         ├── Mode A: Email / Password  ──┐
         │                               │   POST /auth/register or /auth/login
         └── Mode B: Phone / 4-Digit PIN ┼────────────────────────────────────────┐
                                         │                                        │
                                         ▼                                        ▼
                              [ NestJS AuthController ]              [ synthetic anchor normalization ]
                                         │                              012345678@telegram.ppvs.edu.kh
                                         ▼                                        │
                              [ NestJS AuthService ] ◄────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
       [ Firebase Auth Service ]                   [ Firestore Collections ]
    (Stores credentials & issues JWT)           (`users`, `parents`, `students`, `teachers`)
```

---

## 2. Backend Implementation (`NestJS + Firebase`)

### A. Synthetic Anchor Normalization (`AuthService`)

When a user registers or signs in using their phone number (`loginType: 'phone'`), the NestJS `AuthService` (`src/modules/auth/auth.service.ts`) normalizes the phone number into a synthetic email address before interacting with Firebase Admin SDK:

```typescript
// Example normalization pattern inside AuthService
private normalizePhoneToEmail(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  return `${cleanPhone}@telegram.ppvs.edu.kh`;
}
```

#### Why Synthetic Anchors (`@telegram.ppvs.edu.kh`)?

- **Zero SMS Gateway Cost**: Avoids per-message charges associated with OTP SMS providers.
- **Unified Identity Pool**: Allows Firebase Authentication to manage password hashing, account locking, and secure token issuance using its enterprise-grade identity engine.
- **Fast Registration**: Parents and students can create accounts in under 5 seconds using a familiar phone number and a memorable 4-digit PIN.

### B. DTO Validation Standards (`RegisterUserDto` & `LoginDto`)

All public authentication endpoints strictly enforce input schemas using `class-validator` and `class-transformer`:

```typescript
// register-user.dto.ts
export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  identifier!: string; // Email address or raw phone number

  @IsString()
  @IsNotEmpty()
  secret!: string; // Password or 4-digit PIN

  @IsIn(["parent", "student"])
  role!: "parent" | "student";
}
```

### C. Role & Claim Verification (`FirebaseAuthGuard` & `RolesGuard`)

Upon successful authentication, `AuthService` issues a Firebase Custom Token or verifies an ID token. Every protected NestJS route is guarded by:

1. **`FirebaseAuthGuard`**: Validates the Bearer JWT issued by Firebase, extracts `req.user.uid`, and checks user status (`active`).
2. **`RolesGuard`**: Checks the user's role metadata stored in Firestore (`req.user.role`) against the `@Roles(...)` decorator attached to the route handler.

---

## 3. Frontend Implementation (`Angular PWA`)

### A. Reactive Auth Mode & Tab State (`LoginComponent`)

The PWA login component (`src/app/features/auth/login.component.ts`) uses Angular Signals to manage interactive state without complex RxJS overhead:

```typescript
readonly authMode = signal<'signin' | 'signup'>('signin');
readonly activeTab = signal<'email' | 'phone'>('email');
```

- **Persistence**: User tab preference (`email` vs `phone`) is persisted globally via `localStorage.setItem('preferred_auth_method', tab)` so subsequent app launches automatically open their preferred tab.
- **Guardian Certification**: When signing up as a parent, the UI mandates checking the **Guardian Certification** box (`guardianCertified`), ensuring compliance with school data privacy policies before API dispatch.

### B. Payload Dispatch & Error Handling

When the user submits the form (`onSubmit` or `handleSignUp`), the frontend constructs the exact payload expected by the NestJS endpoint:

```typescript
const identifier =
  this.activeTab() === "email" ? this.emailInput : this.phoneInput;
const secret =
  this.activeTab() === "email" ? this.passwordInput : this.pinInput;

// Strict client-side validation
if (this.activeTab() === "phone" && (!secret || secret.length < 4)) {
  this.errorMessage.set("Please enter your 4-digit PIN code.");
  return;
}
```

- **Global Styled Feedback**: Errors returned from the backend (`HttpErrorResponse`) are caught, logged, and formatted into clean, dismissible `.status-alert` notifications (`alert-error`) adhering to the system design tokens.
- **Automatic Role Redirection**: Once authenticated, `AuthService.redirectBasedOnRole(role)` routes the user directly to their respective portal (`/teacher/dashboard`, `/parent/summary`, `/admin`, or `/student/portal`).

---

## 4. Security Best Practices

1. **PIN Length Enforcement**: Phone PINs must be at least 4 digits. For administrative staff (`admin` or `teacher`), robust alphanumeric passwords are enforced via `email` sign-in.
2. **Audit Logging**: All registration and sign-in events trigger `AuditLogsService.logAction(...)` to maintain complete compliance tracking across the school system.
3. **Strict Error Handling**: No `catch {}` blocks are left empty. Every network disconnection or authentication failure is logged to console and visually communicated to the end-user.
