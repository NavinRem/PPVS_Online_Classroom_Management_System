# Angular for Vue.js Developers: Complete Shifting Guide & Practical Curriculum

Welcome to Angular! If you have been developing with **Vue 3 (Composition API)**, you already understand reactive state, component hierarchies, derived values (`computed`), and side effects (`watch`). Modern **Angular (v19/v22 Standalone Architecture with Signals)** maps directly onto your mental model from Vue, while providing a rock-solid, enterprise-grade dependency injection and architecture system.

This guide is structured as both a **Concept Translator** and a **Simultaneous Learning Curriculum** so you can master Angular while building our centralized **Online Classroom PWA**.

---

## Part 1: Is Angular Component-Based Like Vue.js?

**Yes! Angular is 100% component-based.** In fact, modern Standalone Angular Components are conceptually identical to **Vue Single File Components (SFCs)**.

### Comparison: Anatomy of a Component

| Aspect                | Vue 3 Single File Component (`.vue`)                                                   | Angular Standalone Component (`.ts`, `.html`, `.scss`)                                                                                        |
| :-------------------- | :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logic & State**     | `<script setup lang="ts">`<br>`const count = ref(0);`<br>`</script>`                   | `@Component({ ... })`<br>`export class MyComponent {`<br>`  readonly count = signal(0);`<br>`}`                                               |
| **Template**          | `<template>`<br>`  <button @click="increment()">{{ count }}</button>`<br>`</template>` | Separate `.html` file (`templateUrl: './my.component.html'`) or inline (`template: '<button (click)="increment()">{{ count() }}</button>'`)   |
| **Styling**           | `<style scoped>`<br>`.btn { color: blue; }`<br>`</style>`                              | Separate `.scss` file (`styleUrl: './my.component.scss'`). **Styles are encapsulated (`scoped`) by default** using Angular ViewEncapsulation! |
| **Component Imports** | Auto-imported in `<script setup>` or registered via `components: { ... }`              | Explicitly imported inside `@Component({ imports: [CommonModule, OtherComponent] })`                                                          |

---

## Part 2: The Core Concept Dictionary (Vue $\leftrightarrow$ Angular)

### 1. Reactive State: `ref()` vs. `signal()`

In Vue, `ref()` creates a reactive wrapper where you read and modify `.value`. In Angular, `signal()` creates a reactive function where you read `myVal()` and modify via `.set()` or `.update()`.

#### Vue 3 Composition API

```typescript
import { ref } from "vue";

const userName = ref("Teacher Navin");
const loginCount = ref(0);

// Read
console.log(userName.value);

// Update
loginCount.value++;
userName.value = "Principal Navin";
```

#### Angular Standalone Signals

```typescript
import { signal } from "@angular/core";

export class TeacherProfileComponent {
  readonly userName = signal("Teacher Navin");
  readonly loginCount = signal(0);

  updateProfile() {
    // Read: call as a function ()
    console.log(this.userName());

    // Update with .update() (when new value depends on old value)
    this.loginCount.update((count) => count + 1);

    // Update with .set() (when setting a direct new value)
    this.userName.set("Principal Navin");
  }
}
```

---

### 2. Derived State: `computed()` vs. `computed()`

Both frameworks use `computed()` to create memoized read-only values that automatically track reactive dependencies.

#### Vue 3 Composition API

```typescript
const price = ref(100);
const quantity = ref(2);
const totalPrice = computed(() => price.value * quantity.value);
```

#### Angular Standalone Signals

```typescript
readonly price = signal(100);
readonly quantity = signal(2);
readonly totalPrice = computed(() => this.price() * this.quantity());
```

---

### 3. Side Effects: `watchEffect()` vs. `effect()`

When you need to run code automatically whenever reactive data changes (like logging, or saving to `localStorage`), Vue uses `watchEffect()` or `watch()`. Angular uses `effect()`.

#### Vue 3 Composition API

```typescript
watchEffect(() => {
  console.log(`Current branch ID is now: ${selectedBranchId.value}`);
  localStorage.setItem("branch_id", selectedBranchId.value);
});
```

#### Angular Standalone Signals

In Angular, `effect()` is typically registered inside the component or service constructor:

```typescript
export class BranchSelectorComponent {
  readonly selectedBranchId = signal("branch_001");

  constructor() {
    effect(() => {
      console.log(`Current branch ID is now: ${this.selectedBranchId()}`);
      localStorage.setItem("branch_id", this.selectedBranchId());
    });
  }
}
```

---

### 4. Template Control Flow: `v-if` / `v-for` vs. `@if` / `@for`

Angular v17+ introduced modern built-in control flow directly into HTML templates. It is cleaner than Vue's `v-` directives and requires no extra imports!

#### Conditional Rendering (`@if` / `@else`)

**Vue 3:**

```html
<div v-if="isLoading" class="spinner">Loading...</div>
<div v-else-if="hasError" class="error">Failed to load classes</div>
<div v-else class="content">Classes loaded!</div>
```

**Angular:**

```html
@if (isLoading()) {
<div class="spinner">Loading...</div>
} @else if (hasError()) {
<div class="error">Failed to load classes</div>
} @else {
<div class="content">Classes loaded!</div>
}
```

#### List Rendering (`@for` / `@empty`)

**Vue 3:**

```html
<ul>
  <li v-for="student in studentList" :key="student.id">
    {{ student.name }} ({{ student.attendanceStatus })
  </li>
  <li v-if="studentList.length === 0">No students enrolled in this class.</li>
</ul>
```

**Angular:**

```html
<ul>
  @for (student of studentList(); track student.id) {
  <li>{{ student.name }} ({{ student.attendanceStatus }})</li>
  } @empty {
  <li>No students enrolled in this class.</li>
  }
</ul>
```

_(Note: `track student.id` is Angular's exact equivalent of Vue's `:key="student.id"`, which optimizes DOM rendering speed during list updates! And `@empty` handles empty lists automatically!)_

---

### 5. Property Bindings & Event Listeners (`:` and `@` vs. `[]` and `()`)

- **Vue 3**: `:title="pageTitle"` (`v-bind`) and `@click="handleClick()"` (`v-on`).
- **Angular**: `[title]="pageTitle()"` (Property binding with `[]`) and `(click)="handleClick()"` (Event binding with `()`).

#### Vue 3 vs. Angular Quick Cheat Sheet

| Action                  | Vue 3 Template Syntax           | Angular Template Syntax                                |
| :---------------------- | :------------------------------ | :----------------------------------------------------- |
| **Bind CSS Class**      | `:class="{ active: isActive }"` | `[class.active]="isActive()"`                          |
| **Bind Style**          | `:style="{ color: textColor }"` | `[style.color]="textColor()"`                          |
| **Bind Attribute/Prop** | `:disabled="isSubmitting"`      | `[disabled]="isSubmitting()"`                          |
| **Click Event**         | `@click="saveAttendance()"`     | `(click)="saveAttendance()"`                           |
| **Input Change Event**  | `@input="onSearch($event)"`     | `(input)="onSearch($event)"`                           |
| **Two-Way Binding**     | `v-model="searchQuery"`         | `[(ngModel)]="searchQuery"` _(Banana-in-a-box syntax)_ |

---

## Part 3: State Management & Dependency Injection (`provide/inject` vs. `@Injectable`)

In Vue, when you want to share data between completely different pages (e.g., storing the authenticated Teacher profile or parent's selected campus), you usually use **Pinia Stores**.

In Angular, **Services ARE your stores!** Any class decorated with `@Injectable({ providedIn: 'root' })` is created once as a **Global Singleton** (exactly like a Pinia store) and can be injected into any component using `inject(MyService)`.

### Example: Pinia Store vs. Angular Service Store

#### Vue 3 Pinia Store (`stores/auth.ts`)

```typescript
export const useAuthStore = defineStore("auth", () => {
  const user = ref<TeacherProfile | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  function login(token: string, profile: TeacherProfile) {
    user.value = profile;
    localStorage.setItem("access_token", token);
  }

  return { user, isAuthenticated, login };
});
```

#### Angular Singleton Service (`core/services/auth.service.ts`)

```typescript
import { Injectable, signal, computed } from "@angular/core";
import { TeacherProfile } from "../../models/user.model";

@Injectable({
  providedIn: "root", // Singleton across the entire PWA
})
export class AuthService {
  readonly user = signal<TeacherProfile | null>(null);
  readonly isAuthenticated = computed(() => !!this.user());

  login(token: string, profile: TeacherProfile) {
    this.user.set(profile);
    localStorage.setItem("access_token", token);
  }
}
```

#### Injecting & Using inside a Component

```typescript
import { Component, inject } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-top-navbar",
  template: `
    @if (auth.isAuthenticated()) {
      <span>Welcome, {{ auth.user()?.name }}!</span>
    }
  `,
})
export class TopNavbarComponent {
  // Inject the store/service directly!
  readonly auth = inject(AuthService);
}
```

---

## Part 4: Managing Centralized Auth & Multiple Roles in One PWA Architecture

When building an online school management system with multiple roles (**Teachers, Parents, Students, Admins**), how do we manage UI design, consistency, and centralized login?

### The Architecture: Centralized PWA Portal (`portal-pwa`)

Instead of copying code across separate apps, our architecture creates a **Centralized Authentication & Role-Based Navigation System**:

1. **Centralized Auth Page (`features/auth/login.component.ts`)**:
   - Every user (Teacher, Parent, Student, Admin) navigates to `/login`.
   - The user inputs credentials (email/password or phone/PIN).
   - The backend `/auth/login` returns the JWT `access_token` along with the user's `role` (`teacher`, `parent`, `student`, `admin`) and profile data (`uid`, `branchId`, `name`).
2. **Role-Based Portal Routing**:
   - `AuthService` stores the token and redirects the user immediately to their role's specific dashboard:
     - `role === 'teacher'` $\rightarrow$ `/teacher/dashboard`
     - `role === 'parent'` $\rightarrow$ `/parent/dashboard`
     - `role === 'student'` $\rightarrow$ `/student/dashboard`
     - `role === 'admin'` $\rightarrow$ `/admin/dashboard`
3. **Shared UI & Design System (`shared/` & `core/`)**:
   - Whether the logged-in user is a Teacher taking attendance or a Parent checking their child's scores, both views use the exact same high-contrast, beautiful glassmorphic UI components (`<app-branch-badge>`, `<app-offline-banner>`, `<app-bottom-nav>`, `<app-loading-spinner>`).
   - All network calls pass through the exact same `authInterceptor` and `OfflineSyncService`.

## Part 5: Styling Architecture in Angular — SCSS vs. Tailwind & Centralized Shared Folder

When building enterprise web apps and PWAs, a common question arises: **Should we use Tailwind CSS or SCSS for Angular? And how do we keep styling clean and reusable without rewriting CSS classes across every component?**

### 1. SCSS vs. Tailwind CSS in Angular

#### Why Tailwind works well in some Vue projects:

In Vue's Single File Components (`.vue`), utility classes like `class="flex items-center justify-between p-4 bg-slate-900 rounded-xl"` are popular because they allow rapid UI prototyping directly inside `<template>`.

#### Why SCSS + Centralized Tokens is better for Angular (`styleUrl`):

In Angular, every component has its own dedicated stylesheet file (`styleUrl: './component.scss'`) backed by **native view encapsulation**. When you use SCSS with centralized design tokens (`$color-primary`, `@include glass-card;`):

1. **Clean HTML Templates**: Your HTML stays concise, readable, and semantic (`class="student-card status-present"`) instead of being bloated with 15+ utility classes per tag.
2. **True DRY Reusability**: If you change the primary indigo gradient or border radius of cards across the school system, you change one variable or mixin in `_variables.scss` or `_mixins.scss`, and every single component updates instantly.
3. **No Utility Clutter or Budget Warnings**: Angular compiles scoped component CSS efficiently without utility-class string duplication across templates.

---

### 2. The Centralized Shared Folder Pattern (`src/app/shared/styles/`)

To prevent developers from rewriting hex colors (`#6366f1`), shadows (`box-shadow: 0 4px 15px...`), and spacing across individual component `.scss` files, we enforce the **Centralized Shared Folder Rule**:

#### Folder Structure:

```
src/app/
├── shared/
│   ├── components/            <-- Shared reusable UI components (Badges, Modals, Spinners)
│   └── styles/                <-- Centralized SCSS Design System
│       ├── _variables.scss    <-- Design Tokens: Colors, Typography, Spacing, Shadows, Radii
│       ├── _mixins.scss       <-- Reusable Layout Mixins: @include glass-card, @include flex-between
│       └── _utilities.scss    <-- Global Utility Classes (`.btn-primary`, `.status-pill`)
```

#### How to Use in Any Component (`attendance-check-in.component.scss`):

Instead of hardcoding colors:

```scss
/* Bad (Hardcoded, duplicate across files) */
.student-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
```

Import and call by name:

```scss
/* Good (Centralized, called by name) */
@use "../../../shared/styles/variables" as vars;
@use "../../../shared/styles/mixins" as mixins;

.student-card {
  @include mixins.glass-card;
  border-radius: vars.$radius-card;
  padding: vars.$space-md vars.$space-lg;
}
```

---

## Part 6: Frontend Services vs. Backend Services — Why Does the PWA Have Services?

When transitioning from full-stack or Vue development, a common question arises:
**"If we already wrote `AttendanceService` or `AuthService` in our NestJS backend (`/backend/src/modules/attendance/attendance.service.ts`), why do we ALSO create an `AttendanceService` inside the PWA (`/teacher-pwa/src/app/features/teacher/attendance/attendance.service.ts`)? Does the PWA just call the backend?"**

### The Answer: Clear Separation of Responsibilities

Frontend PWA services **do not duplicate backend database queries, validation rules, or business logic**. Instead, they serve **4 distinct frontend responsibilities**:

1. **HTTP Client & API Bridge**:
   - The frontend `AttendanceService` is a type-safe API wrapper. It formats the TypeScript payload (`BatchCheckInPayload`), attaches authorization parameters, and executes `this.http.post<any>(`${environment.apiUrl}/attendance/check-in`, payload)`.
   - All actual business validation (such as verifying teacher class ownership, checking student enrollment, attaching `createdAt`/`createdBy` audit records, and writing to Firestore) is executed securely by the **NestJS Backend (`AttendanceService`)**.

2. **State Management & Reactive UI Stores**:
   - Frontend services like `AuthService` (`core/services/auth.service.ts`) act as in-memory global state stores (`signal()`). When a teacher logs in or selects a different school branch (`branch_pp_01`), `AuthService` instantly updates the navbar (`PortalLayout`), the dashboard card list (`DashboardComponent`), and attendance rosters simultaneously across the browser without needing a full page reload or pounding the server with redundant requests.

3. **Offline PWA Resilience & Device Queue (`OfflineSyncService`)**:
   - Because this application is a **Progressive Web App (PWA)**, teachers must be able to record attendance (`Present`, `Homeworked`, `Permission`, `Absent`) and numeric grades **even when Wi-Fi disconnects or when teaching outdoors**.
   - When offline, our frontend `AttendanceService` detects network loss and redirects the save payload directly to `OfflineSyncService`. The PWA saves the records into browser `localStorage` (`ppvs_offline_queue`).
   - Once internet connectivity returns (`navigator.onLine`), `OfflineSyncService` automatically drains the local device queue and transmits the data to the NestJS backend API. The cloud server cannot do this alone—only a frontend PWA service can intercept offline actions!

4. **Security & Header Interception (`authInterceptor`)**:
   - The frontend `authInterceptor` (`core/interceptors/auth-interceptor.ts`) acts as global HTTP middleware. Before any outbound API request leaves the browser, it injects `Authorization: Bearer <token>` and `X-Branch-Id: <campus_code>` automatically.

---

## Part 7: How to Run, Test, and Build the PWA Locally

To run and verify the PWA during development, follow these exact terminal commands:

### 1. Running the Development Server (`npm start` or `ng serve`)

> [!WARNING]
> Do NOT run `ng start` directly—Angular CLI does not recognize `ng start` and will output `Error: Unknown argument: start`.

To start the PWA dev server with live reloading:

```bash
# Option A (Using npm script defined in package.json)
cd teacher-pwa && npm start

# Option B (Using Angular CLI directly)
cd teacher-pwa && npx ng serve
```

- The PWA will compile and open at: **`http://localhost:4200`**
- Ensure your backend NestJS server is running simultaneously in another terminal (`cd backend && npm run start:dev` on **`http://localhost:3000`**).

### 2. Running Automated Unit Tests (`npm test`)

To run the 10 automated test suites (26 unit tests across components and services) without hanging the terminal:

```bash
cd teacher-pwa && npm test -- --watch=false
```

### 3. Building the Production PWA Bundle (`npm run build`)

To compile the standalone client and server bundles for production deployment:

```bash
cd teacher-pwa && npm run build
```

- The production build is output to: **`dist/teacher-pwa/`**

---

## Part 8: Step-by-Step Learning Checklist for Beginners

As we execute Phase 7 together, you can follow along with this practical learning checklist:

- [ ] **Step 1: Understand Standalone Components & Signals**
  - Observe how we define `LoginComponent` (`features/auth/login.component.ts`) using `@Component({ imports: [FormsModule] })` and signals for email, password, and loading status (`readonly isLoading = signal(false)`).
- [ ] **Step 2: Master Dependency Injection (`inject()`)**
  - See how `LoginComponent` injects `AuthService` and `Router` via `private authService = inject(AuthService); private router = inject(Router);` without writing boilerplated constructors.
- [ ] **Step 3: Practice Angular Built-In Control Flow (`@if`, `@for`)**
  - See how our login form displays error banners using `@if (errorMessage()) { <div class="alert">...</div> }`.
- [ ] **Step 4: Explore Interceptors & HTTP Client**
  - See how `authInterceptor` (`core/interceptors/auth-interceptor.ts`) acts like Axios middleware, intercepting every request to attach `Bearer <token>` and `X-Branch-Id` headers cleanly.
- [ ] **Step 5: Apply Centralized Styling & Tokens (`@use`)**
  - See how our component SCSS files call shared variables (`vars.$color-primary`) and mixins (`@include mixins.glass-card;`) to maintain consistent, premium aesthetics across every view.
- [ ] **Step 6: Experience Offline-First PWA Capabilities**
  - Test disconnecting Wi-Fi or setting Network to Offline in Chrome DevTools $\rightarrow$ mark attendance $\rightarrow$ see the payload saved into `OfflineSyncService` and synced when reconnected.

---

## Part 9: PWA Auth Integration Checklist & Execution Guide

To achieve full, production-ready integration between our Centralized PWA Auth Portal (`LoginComponent`) and our NestJS Backend (`/auth/login`, `/auth/register-*`), follow this comprehensive step-by-step verification checklist:

### Phase A: Local Environment Preparation & Verification

- [ ] **Task 1: Verify API Endpoint Configuration**
  - Check `src/app/core/config/environment.ts` to ensure `apiUrl` points precisely to our local NestJS dev server:
    ```typescript
    export const environment = {
      production: false,
      apiUrl: "http://localhost:3000",
      appName: "PPVS Classroom PWA",
    };
    ```
- [ ] **Task 2: Launch Backend API Server (Terminal 1)**
  - Open a dedicated terminal inside `/backend/` and start the NestJS server:
    ```bash
    cd backend && npm run start:dev
    ```
  - Verify that NestJS reports `[NestApplication] Nest application successfully started` on `http://localhost:3000`.
- [ ] **Task 3: Launch PWA Development Server (Terminal 2)**
  - Open a second terminal inside `/teacher-pwa/` and start the live-reloading dev server:
    ```bash
    cd teacher-pwa && npm start
    ```
  - Open your browser to **`http://localhost:4200`**. The PWA will automatically render our centralized glassmorphic `/login` page.

---

### Phase B: Auth Page UI Rendering & Verification

- [ ] **Task 4: Inspect Visual Aesthetics & Glassmorphic Design**
  - Verify that `LoginComponent` (`/login`) renders cleanly with high-contrast gradients, smooth micro-animations, and responsive tab buttons (`Email & Password` vs. `Phone & 4-Digit PIN`).
- [ ] **Task 5: Test Multi-Role Selection Matrix**
  - Click through the 4 role buttons (`Teacher`, `Parent`, `Student`, `Admin`) across the top card.
  - Observe how the input placeholders dynamically adapt (e.g., `teacher@ppvs.edu.kh` vs. `parent@ppvs.edu.kh`).
- [ ] **Task 6: Verify Google SSO Button (`loginWithGoogle`)**
  - Verify that the **Continue with Google** button is visible and clearly marked: _"Google sign-in is strictly verified against system profiles. No public sign-up is permitted for Teachers or Admins."_
- [ ] **Task 7: Test Security Restriction on Public Registration**
  - Switch to the **✨ New Parent / Student Sign Up** tab.
  - Click the **Teacher** or **Admin** role badge while in sign-up mode.
  - Verify that the UI immediately blocks selection and renders our security alert: _"Public sign-up is strictly restricted for Teachers and Admins. Please contact School Administration."_

---

### Phase C: Backend API Integration & Fallback Resilience

- [ ] **Task 8: Test Real API Sign-In Integration (`POST /auth/login`)**
  - Enter valid credentials (`loginType: 'email'`, `email: 'teacher@ppvs.edu.kh'`, `password: 'secret'`).
  - When submitted (`onSubmit`), `LoginComponent` fires `authService.login(payload)`, sending `POST http://localhost:3000/auth/login`.
  - Open Chrome DevTools $\rightarrow$ **Network Tab** to inspect the outbound request payload and headers (`Content-Type: application/json`).
  - Upon receiving the `201/200 OK` response with `accessToken`, `AuthService` stores the token in `localStorage` (`access_token`) and instantly routes the user to `/teacher/dashboard`.
- [ ] **Task 9: Verify Interceptor Authentication Headers (`authInterceptor`)**
  - Once logged in and redirected to `/teacher/dashboard`, inspect any subsequent API call (such as fetching classes or attendance rosters).
  - Verify in Chrome DevTools Network Tab that `authInterceptor` (`src/app/core/interceptors/auth-interceptor.ts`) automatically injects:
    ```http
    Authorization: Bearer <jwt_token>
    X-Branch-Id: branch_pp_01
    ```
- [ ] **Task 10: Verify Offline / Fallback Demo Resilience**
  - If the backend server is temporarily shut down or if the teacher has disconnected from Wi-Fi, verify that submitting login credentials seamlessly catches the connection error (`error callback`) and invokes `this.authService.demoLogin(...)`. This guarantees that developers and teachers can continue working and testing offline queues without stalling!

---

### Phase D: Automated Unit Testing & Continuous Integration

- [ ] **Task 11: Run Full Automated Test Suite (`npm test`)**
  - Execute our verified test runner to confirm zero regression across all 10 suites (26 unit tests):
    ```bash
    cd teacher-pwa && npm test -- --watch=false
    ```
  - Verify clean completion: `Test Files: 10 passed (10)`, `Tests: 26 passed (26)`.
- [ ] **Task 12: Run Prettier Formatting Check (`instant formatting`)**
  - Ensure zero lint warnings or formatting discrepancies before committing:
    ```bash
    cd teacher-pwa && npx prettier --write "src/app/**/*.ts"
    ```
