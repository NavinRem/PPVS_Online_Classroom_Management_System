# PPVS Online Classroom Management System

An advanced, full-stack **Online Classroom & Tuition Management Platform** tailored for schools, teachers, parents, and students. Built with a **NestJS + Firebase Firestore** backend and a **Progressive Web Application (PWA)** frontend.

---

## 🚀 Key Features

- **Multi-Role RBAC & Visibility**:
  - **Admins**: Full management across all 13 domain modules, system analytics, and audit tracking.
  - **Teachers**: Class session & material management, batch attendance (`present`, `homeworked`, `permission`, `absent`), and grade recording.
  - **Parents & Students**: Portal for tracking individual class performance, homework completion status, attendance history, and tuition invoices.
- **Tuition & Payment Management**:
  - Native support for **Cambodian Riel (`KHR`)** currency across all invoices, billing cycles, and checkout receipts.
  - Real-time webhook verification and simulated gateway testing.
- **Audit Logging & Modification History**:
  - Comprehensive tracking (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`) across all records with user context (`uid`, `role`, `name`).
- **Blueprint Architectural Pattern**:
  - Clean, DRY Firestore backend service layer using strictly typed `FirestoreBaseService<T>` with automatic timestamp and user context formatting hooks (`formatCreatePayload`, `formatUpdatePayload`, `formatResponse`).

---

## 🏗️ Monorepo Structure

```text
PPVS_Online_Classroom_Management_System/
├── backend/                  # NestJS API Backend (TypeScript strict mode)
│   ├── src/
│   │   ├── common/           # Blueprint services (FirestoreBaseService) & utilities
│   │   ├── config/           # Firebase Admin & application settings
│   │   ├── modules/          # 13 Domain Modules (Auth, Users, Classes, Enrollments, Attendance, etc.)
│   │   └── main.ts           # App bootstrap with strict error catching (.catch)
│   └── test/
├── frontend/                 # PWA Web Application for Mobile & Desktop
├── docker-compose.yml        # Local development infrastructure
├── firebase.json             # Firebase configuration & emulators
└── GEMINI.md                 # Mandatory AI workspace rules & architectural standards
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js** (v20+ recommended)
- **Firebase CLI** (`npm i -g firebase-tools`)
- **Docker & Docker Compose** (optional, for emulators)

### 1. Backend Setup (`/backend`)
```bash
cd backend
npm install
```

Configure your Firebase credentials by placing `firebase-service-account.json` inside `./backend/` (this file is automatically ignored by `.gitignore` for security) or by setting environment variables in `./backend/.env`.

Run the backend development server:
```bash
# Watch mode
npm run start:dev

# Build check
npm run build

# Code quality check
npm run lint
```

### 2. Frontend Setup (`/frontend`)
```bash
cd ../frontend
npm install
npm run dev
```

---

## 📐 AI & Development Standards (`GEMINI.md`)

This project follows strict consistency rules outlined in [`GEMINI.md`](./GEMINI.md):
1. **No `any` Types**: All modules use strict TypeScript interfaces, classes, and `Record<string, unknown>`.
2. **Blueprint Inheritance**: Every backend service inherits from `FirestoreBaseService<T>` and utilizes `formatCreatePayload`, `formatUpdatePayload`, and `formatResponse`.
3. **Full CRUD Endpoints**: Every domain controller exposes standard `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` endpoints guarded by `FirebaseAuthGuard` and `RolesGuard`.
4. **Mandatory Planning**: Always create and review an `implementation_plan.md` before executing structural modifications.

---

## 🔐 Security & Git Exclusions

The repository `.gitignore` strictly protects sensitive credentials from being committed:
- `backend/firebase-service-account.json`
- `.env` / `backend/.env` / `frontend/.env`
- `node_modules/`, `dist/`, `.angular/`
