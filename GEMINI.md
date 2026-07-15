# AI Agent Workspace Rules (`GEMINI.md`)

This document defines the **mandatory global rules and architectural standards** for any AI agent (e.g., Antigravity, Gemini) working on the **PPVS Online Classroom Management System** workspace. All AI assistants must strictly follow these rules to maintain code consistency, type safety, and architectural accuracy.

---

## 1. Mandatory Workflow & Planning Discipline

1. **Plan Before Execute (`plan before execute`)**: For any non-trivial architectural change, multi-file refactor, or new feature request, the agent **must** create or update `implementation_plan.md` and obtain explicit user approval before modifying code files.
2. **Documentation & Integrity**: Never delete or strip existing docstrings, comments, or error handlers unrelated to the immediate task.
3. **Monorepo Integrity**: This project is a unified monorepo (`backend/`, `frontend/`, `docker-compose.yml`, `firebase.json`) tracked by a single Git repository (`/.git`). **Never** initialize nested `.git` directories inside `backend/` or `frontend/`.

---

## 2. Backend Rules (NestJS + Firebase Firestore)

### A. Strict TypeScript (`no any` Policy)
- **Never use `any`**. All DTOs, service payloads, and interfaces must use strict typing, classes, or `Record<string, unknown>`.
- When converting TypeScript class instances (`CreateDto`, `Partial<CreateDto>`) to `Record<string, unknown>` for Firestore formatting, always cast through `unknown` first (`data as unknown as Record<string, unknown>`) to prevent `TS2352` index signature compilation errors.

### B. Blueprint Service Architecture (`FirestoreBaseService<T>`)
- Every domain module service (e.g., `UsersService`, `PaymentsService`, `AssessmentsService`, `AttendanceService`, `SessionsService`, `NotificationsService`, `EnrollmentsService`, `ClassesService`) **must inherit from `FirestoreBaseService<T>`** (`src/common/firebase-base.service.ts`).
- **Template Hooks**: Always use the protected formatting hooks provided by `FirestoreBaseService<T>`:
  - `formatCreatePayload(data, auditContext)`: Automatically attaches `createdAt`, `createdBy`, `updatedBy`.
  - `formatUpdatePayload(data, auditContext)`: Automatically attaches `updatedAt`, `updatedBy`.
  - `formatResponse(id, data)`: Wraps Firestore document data with its string `id`.
- Do not duplicate standard `findAll()`, `findOne(id)`, `update(id, data)`, or `remove(id)` implementation logic inside child services unless adding domain validation or custom queries.

### C. Standardized Controller & Module Requirements
- Every backend module **must** be registered in `src/app.module.ts`.
- Every backend module **must** have a dedicated `update-*.dto.ts` file extending `PartialType(CreateDto)`.
- Every controller **must** expose complete CRUD endpoints (`GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) guarded by `FirebaseAuthGuard` and `RolesGuard`, alongside any domain-specific workflow endpoints (`/check-in`, `/checkout`, `/grades`, etc.).

### D. Application Startup (`main.ts`)
- **Never use `void bootstrap();`**.
- Always use `.catch()` promise error handling around `bootstrap()` to log fatal startup exceptions and exit cleanly with code `1`:
  ```typescript
  bootstrap().catch((error: unknown) => {
    console.error('Fatal error during NestJS application startup:', error);
    process.exit(1);
  });
  ```

### E. Audit Logging
- Data mutations (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`) must record audit trails using `AuditLogsService.logAction(...)`.
- Pass `AuditContext` (`{ uid: string; role?: string; name?: string }`) from the authenticated request object (`req.user`) to ensure complete tracking of modification history.

---

## 3. Business Domain Standards

1. **Currency (Cambodian Riel - `KHR`)**:
   - All invoices, tuition payments, checkout flows, and monetary calculations must use **Cambodian Riel (`KHR`)** as the active currency. Do not default to USD.
2. **Attendance Statuses**:
   - Attendance records must strictly support the four customized statuses:
     ```typescript
     'present' | 'homeworked' | 'permission' | 'absent'
     ```
   - The system tracks not only absence or physical presence (`present`), but specifically distinguishes students who came to class and completed homework (`homeworked`) and those on approved leave (`permission`).
3. **Role & Visibility Boundaries**:
   - **Parents & Students**: Can view their own performance summaries (`getStudentSummary`), attendance histories (`getStudentAttendanceHistory`), and invoices (`getMyInvoices`).
   - **Teachers**: Can record grades, batch check-in attendance, create class sessions/materials, and view assigned classes.
   - **Admins**: Have full access across all endpoints and data collections.

---

## 4. Frontend Rules (PWA / Web Application)

- **Aesthetics & Experience**: Prioritize modern, high-contrast, premium UI design (rich color palettes, smooth micro-animations, glassmorphism, responsive layouts).
- **Offline / PWA Capable**: Ensure mobile and tablet interfaces work reliably as Progressive Web Apps for parents, teachers, and students.
