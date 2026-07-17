# PPVS Online Classroom Management System — Backend Architecture & Testing Guide

This document serves as the comprehensive engineering reference and architectural blueprint for the backend of the **PPVS Online Classroom Management System**. Built with **NestJS (TypeScript)** and **Firebase Firestore**, this backend operates strictly within a unified monorepo structure (`backend/`, `frontend/`, `docker-compose.yml`, `firebase.json`) under a single Git root (`/.git`).

---

## Table of Contents
1. [Architectural Overview & Monorepo Integrity](#1-architectural-overview--monorepo-integrity)
2. [The Blueprint Service Architecture (`FirestoreBaseService<T>`)](#2-the-blueprint-service-architecture-firestorebaseservicet)
3. [Authentication & Role-Based Access Control (RBAC)](#3-authentication--role-based-access-control-rbac)
4. [Domain Modules & Complete CRUD Inventory](#4-domain-modules--complete-crud-inventory)
5. [Core Business Domain Workflows](#5-core-business-domain-workflows)
   - [A. Attendance Check-In (`present`, `homeworked`, `permission`, `absent`)](#a-attendance-check-in-present-homeworked-permission-absent)
   - [B. Academic Assessment & GPA Calculation (`4.0 A` Scale)](#b-academic-assessment--gpa-calculation-40-a-scale)
   - [C. Cambodian Riel (`KHR`) Billing, KHQR Checkout & Webhook Activation](#c-cambodian-riel-khr-billing-khqr-checkout--webhook-activation)
6. [Local Emulator, Automated Seeding & Simulation (`npm run seed`)](#6-local-emulator-automated-seeding--simulation-npm-run-seed)
7. [Automated Testing Guide (`npm run test` & `npm run test:e2e`)](#7-automated-testing-guide-npm-run-test--npm-run-teste2e)

---

## 1. Architectural Overview & Monorepo Integrity

### Strict TypeScript (`no any` Policy)
Our backend enforces strict TypeScript typing across all domain layers:
- **No `any` usage**: All DTOs, controllers, and services use explicit TypeScript types, classes, or `Record<string, unknown>`.
- **Firestore Type Safety**: When casting data payloads (`CreateDto` or `Partial<CreateDto>`) for Firestore storage, casting is performed via `(data as unknown as Record<string, unknown>)` to ensure clean compilation without index signature errors (`TS2352`).

### Firebase Admin & Local Emulator Sandboxing
The application interfaces with Firestore through the single `FirebaseService` singleton (`src/config/firebase/firebase.service.ts`). During local development and testing, `FirebaseService` connects directly to the local **Firestore Emulator Sandbox** running on `127.0.0.1:8080`, ensuring zero unintended modifications to production cloud environments while allowing fast, reproducible testing.

---

## 2. The Blueprint Service Architecture (`FirestoreBaseService<T>`)

Every domain module service inside our application inherits from the abstract generic service **`FirestoreBaseService<T>`** (`src/common/firebase-base.service.ts`). This architectural pattern guarantees DRY (Don't Repeat Yourself) consistency across all 11 modules while standardizing data formatting and audit trail hooks.

### Protected Formatting Hooks
1. **`formatCreatePayload(data, auditContext)`**: Automatically attaches `createdAt` and `updatedAt` timestamps in ISO string format. If an `AuditContext` (`{ uid, role, email }`) is provided, attaches `createdBy` and `updatedBy`.
2. **`formatUpdatePayload(data, auditContext)`**: Automatically updates `updatedAt` and attaches `updatedBy`.
3. **`formatResponse(id, data)`**: Safely wraps Firestore document snapshots with their string `id`.

### Complete Standard CRUD Capabilities
By inheriting from `FirestoreBaseService<T>`, every domain service exposes 5 standard CRUD methods out of the box:
- **`create(data, auditContext)`**: Creates a document in `this.collectionName` and returns `{ id, message }`.
- **`findAll()`**: Queries all documents across the collection.
- **`findOne(id)`**: Fetches a single document by string ID or throws `NotFoundException` (`404`).
- **`update(id, data, auditContext)`**: Performs a partial update (`PATCH`) and returns `{ id, message }`.
- **`remove(id)`**: Deletes the document from Firestore and returns `{ id, message }`.

---

## 3. Authentication & Role-Based Access Control (RBAC)

Security is managed at the controller layer using NestJS guards and passport strategies (`src/modules/auth/`):

1. **`FirebaseAuthStrategy` (`passport-firebase-jwt`)**: Intercepts incoming requests, extracts the `Bearer <JWT>` from the `Authorization` header, and verifies the token against `firebase-admin/auth`.
2. **`FirebaseAuthGuard`**: Protects endpoints by ensuring valid token authentication. Returns `401 Unauthorized` (`message: "Unauthorized"`) if the token is missing or invalid.
3. **`RolesGuard` & `@Roles('admin', 'teacher', ...)`**: Enforces multi-tier permissions. If an authenticated user's role does not match the allowed roles on an endpoint, throws `403 Forbidden` (`message: "Forbidden resource"`).
4. **`@CurrentUser()` Decorator**: Injects the authenticated user payload (`AuditContext`: `{ uid, role, email }`) directly into controller actions to trace data ownership and pass into `auditLogsService`.

---

## 4. Domain Modules & Complete CRUD Inventory

Every controller exposes complete CRUD endpoints guarded by `FirebaseAuthGuard` alongside specialized domain workflows:

| Module | Controller Prefix | Collection Name | Key CRUD & Workflow Endpoints |
| :--- | :--- | :--- | :--- |
| **UsersModule** | `/users` | `users` | `GET /users/me`, `PATCH /users/me`, `GET /users/:uid`, `POST /users` |
| **TeachersModule** | `/teachers` | `teachers` | `POST /teachers`, `GET /teachers`, `GET /teachers/:id`, `PATCH /teachers/:id`, `GET /teachers/me/assigned-classes` |
| **ParentsModule** | `/parents` | `parents` | `POST /parents`, `GET /parents`, `GET /parents/:id`, `PATCH /parents/:id`, `DELETE /parents/:id` |
| **StudentsModule** | `/students` | `students` | `POST /students`, `GET /students`, `GET /students/:id`, `PATCH /students/:id`, `DELETE /students/:id`, `GET /students/me/my-children` |
| **ClassesModule** | `/classes` | `classes` | `POST /classes`, `GET /classes`, `GET /classes/:id`, `PATCH /classes/:id`, `DELETE /classes/:id` |
| **SessionsModule** | `/sessions` | `class_sessions`<br>`course_materials` | `POST /sessions`, `GET /sessions`, `PATCH /sessions/:id`, `DELETE /sessions/:id`<br>`POST /sessions/materials`, `GET /sessions/materials`, `PATCH /sessions/materials/:id`, `DELETE /sessions/materials/:id` |
| **EnrollmentsModule** | `/enrollments` | `enrollments` | `POST /enrollments` (Atomic Transaction), `GET /enrollments`, `GET /enrollments/:id`, `PATCH /enrollments/:id`, `DELETE /enrollments/:id`, `GET /enrollments/me/my-schedule` |
| **AttendanceModule** | `/attendance` | `attendance_records` | `POST /attendance/check-in` (`batchCheckIn`), `GET /attendance`, `GET /attendance/:id`, `PATCH /attendance/:id`, `DELETE /attendance/:id`, `GET /attendance/student/:studentId` |
| **AssessmentsModule** | `/assessments` | `assessments`<br>`student_grades` | `POST /assessments`, `GET /assessments`, `GET /assessments/:id`, `PATCH /assessments/:id`, `DELETE /assessments/:id`<br>`POST /assessments/grades`, `GET /assessments/student/:studentId/summary` |
| **PaymentsModule** | `/payments` | `invoices`<br>`payment_transactions` | `POST /payments/create-invoice` (KHR), `GET /payments/invoices`, `GET /payments/invoices/:id`, `PATCH /payments/invoices/:id`, `DELETE /payments/invoices/:id`<br>`POST /payments/checkout` (KHQR), `POST /payments/webhook` |
| **NotificationsModule** | `/notifications` | `notifications`<br>`announcements` | `POST /notifications/send`, `GET /notifications/me`<br>`POST /announcements`, `GET /announcements`, `GET /announcements/:id`, `PATCH /announcements/:id`, `DELETE /announcements/:id` |
| **AuditLogsModule** | `/audit-logs` | `audit_logs` | `GET /audit-logs` (Admin monitoring of all domain mutations) |

---

## 5. Core Business Domain Workflows

### A. Attendance Check-In (`present`, `homeworked`, `permission`, `absent`)
Our classroom system distinguishes between physical presence and academic engagement:
- **Four Customized Statuses**: Attendance records must strictly use:
  - `'present'` (Present in class)
  - `'homeworked'` (Present in class AND completed assigned homework)
  - `'permission'` (Approved leave / permission)
  - `'absent'` (Unexcused absence)
- **Batch Check-In Mechanics**: Teachers submit `BatchCheckInDto` (`POST /attendance/check-in`). If a record already exists for `classId` and `date`, the system performs an atomic update; otherwise, it creates a new record.
- **Engagement Percentage & Ownership**: `getStudentAttendanceHistory(studentId, requesterUid, requesterRole)` verifies that parents can only view their own children (`ForbiddenException`). It computes total sessions and exact engagement:
  $$\text{Engagement Percentage} = \frac{\text{Present Count} + \text{Homeworked Count}}{\text{Total Sessions}} \times 100\%$$

### B. Academic Assessment & GPA Calculation (`4.0 A` Scale)
- **Assignment Creation & Grade Recording**: Teachers create assessments (`exam`, `quiz`, `homework`, `project`) and record grades (`student_grades` collection).
- **GPA Calculation Equivalent**: `getStudentPerformanceSummary` aggregates scores across all graded assessments:
  $$\text{Overall Percentage} = \frac{\sum \text{Earned Scores}}{\sum \text{Max Scores}} \times 100\%$$
  Then maps the percentage to standard GPA letter grades:
  - $\ge 90\% \rightarrow$ `4.0 (A)`
  - $\ge 80\% \rightarrow$ `3.0 (B)`
  - $\ge 70\% \rightarrow$ `2.0 (C)`
  - $\ge 60\% \rightarrow$ `1.0 (D)`
  - $< 60\% \rightarrow$ `0.0 (F)`

### C. Cambodian Riel (`KHR`) Billing, KHQR Checkout & Webhook Activation
- **Cambodian Riel (`KHR`) Currency Requirement**: All invoices (`createInvoice`), tuition amounts, and monetary operations operate strictly in **Cambodian Riel (`KHR`)**.
- **KHQR QR Code Generation**: When a parent initiates checkout (`POST /payments/checkout`) with `paymentMethod: 'qr_code'`, `PaymentsService.initiateCheckout` returns a simulated **KHQR PromptPay QR string payload** (`0002010102...`) ready for scanning via mobile banking apps.
- **Webhook Enrollment Activation**: When a payment is confirmed (`POST /payments/webhook` with `status: 'paid'`):
  1. Records transaction history in `payment_transactions`.
  2. Updates invoice `status` to `'paid'` and sets `paidAt`.
  3. **Automatically triggers `EnrollmentsService.updateStatus(enrollmentId, 'active')`**, instantly granting the student full access to classroom sessions and materials!

---

## 6. Local Emulator, Automated Seeding & Simulation (`npm run seed`)

To verify the entire classroom lifecycle without manual API clicking or needing a live Firebase project, the repository includes a self-contained simulation script (`src/scripts/seed.ts`).

### Step 1: Start the Local Firestore Emulator
In a separate terminal (or via background daemon), start the Firestore emulator on port `8080`:
```bash
npx firebase-tools emulators:start --only firestore
```

### Step 2: Execute the Simulation Script
From inside the `backend/` directory, run:
```bash
cd backend
npm run seed
```
**What `npm run seed` does (`SeedModule`)**:
1. Boots a lightweight `SeedModule` connected to `127.0.0.1:8080`.
2. Creates accounts for **1 Admin, 2 Teachers, 2 Parents, and 3 Students**.
3. Creates 2 Online Classes (`Mathematics 101` and `Physics 201` at `400,000 KHR` & `500,000 KHR`).
4. Enrolls all 3 students via atomic transactions (`status: 'pending_payment'`).
5. Generates `KHR` tuition invoices and executes `confirmPayment` webhooks to activate enrollments (`status: 'active'`).
6. Creates scheduled class sessions and uploads course materials (`pdf` & `video`).
7. Submits batch attendance rosters covering all 4 statuses (`present`, `homeworked`, `permission`, `absent`).
8. Creates midterm assessments, records student grades (`score: 95/100`), and verifies `GPA 4.0 (A)` computation.
9. Prints a comprehensive, color-coded audit summary of all collections and document counts to the terminal.

---

## 7. Automated Testing Guide (`npm run test` & `npm run test:e2e`)

We maintain a complete, highly reliable automated test suite using **Jest**.

### Handling ESM Dependencies in Jest (`jose.mock.js`)
Because our authentication dependencies (`jwks-rsa` / `firebase-admin`) require the pure ES Module `jose`, which is incompatible with Jest's default CommonJS environment (`SyntaxError: Unexpected token 'export'`), our configuration maps `jose` to a clean mock stub during test execution (`test/mocks/jose.mock.js`):
```json
// package.json & test/jest-e2e.json
"moduleNameMapper": {
  "^jose$": "<rootDir>/../test/mocks/jose.mock.js"
}
```

### Running Unit & Integration Tests (`npm run test`)
Run the domain specifications across our core services:
```bash
cd backend
npm run test
```
**Test Coverage Includes (35+ automated tests passing with 100% success)**:
- **`attendance.service.spec.ts`**: Verifies `create`, `findAll`, `findOne`, `update`, `remove`, `batchCheckIn` with `'homeworked'` status, exact engagement percentage computation, and RBAC parent ownership checks.
- **`assessments.service.spec.ts`**: Verifies full CRUD, `recordGrade`, `overallPercentage`, and GPA letter grade (`4.0 (A)`) computation.
- **`payments.service.spec.ts`**: Verifies `KHR` invoice CRUD, KHQR PromptPay `qrDataPayload` generation, and `confirmPayment` webhook triggering `enrollmentsService.updateStatus(..., 'active')`.
- **`enrollments.service.spec.ts`**: Verifies full CRUD, schedule aggregation, duplicate enrollment rejection, and atomic transaction capacity checks (`currentEnrollment < maxCapacity`).

### Running End-to-End Tests (`npm run test:e2e`)
Verify clean NestJS application bootstrap and API security guard enforcement across endpoint routes:
```bash
cd backend
npm run test:e2e
```
**E2E Coverage (`test/app.e2e-spec.ts`)**:
- Boots `AppModule` against the local emulator.
- Verifies that unauthenticated requests to `/classes`, `/users/me`, and `/assessments` are properly intercepted by `FirebaseAuthGuard` and return `401 Unauthorized`.
