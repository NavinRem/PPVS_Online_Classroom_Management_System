# Testing in Simple Words — How Our Automated Tests Work

If you have ever wondered how developers make sure their code doesn't break when adding new features without spending hours clicking on every button manually, the secret is **Automated Testing**.

This guide explains how the tests inside the **PPVS Online Classroom Management System** work in simple, plain English without heavy technical jargon.

---

## 1. What is an Automated Test?

Think of our automated tests as a **Digital Robot Inspector**.

Imagine hiring a super-fast assistant whose only job is to:

1. Log into your classroom system.
2. Create a new biology class.
3. Register a student into that class.
4. Generate a tuition bill in **Cambodian Riel (`KHR`)**.
5. Simulate paying that bill via **KHQR / Banking QR Code**.
6. Record student grades and double-check if the system calculates `GPA 4.0 (A)` correctly.

A human might take 15 minutes to manually test all of this. Our **Robot Inspector (Jest)** tests **35+ different scenarios across all classroom modules in less than 6 seconds**, ensuring every rule is obeyed with 100% accuracy every single time.

---

## 2. Where Do the Tests Run? (The Local Sandbox)

You might wonder: _"If the tests are constantly creating fake students, classes, and invoices, won't our real database get cluttered with garbage?"_

**No! Because we use a Local Sandbox (`Firestore Emulator`).**

Before our tests run, they connect to a **temporary playground running right on your computer memory (`127.0.0.1:8080`)**, completely disconnected from your live production cloud database.

- Everything created during a test (`student_assess_wf_...`, `class_enroll_crud_...`) is kept safely inside this fake local playground.
- Your real users, real school data, and production environment are **never touched or harmed**.

---

## 3. The Three Ways We Test Our System

Our classroom system is guarded by three distinct levels of testing:

### Level 1: Service Unit & Integration Tests (`npm run test`)

These tests inspect the **Brain (Services)** of our system directly:

- **Attendance Brain**: We feed in a student who came to class and finished their homework (`status: 'homeworked'`), and check if the brain computes their exact engagement percentage correctly without crashing.
- **Grading Brain**: We feed in a physics exam score of `95/100`, and check if the brain converts it precisely to `GPA 4.0 (A)`.
- **Payment & Enrollment Brain**: We test what happens when a parent scans a **KHQR** code and confirms payment. The brain must instantly switch the student's enrollment status from `pending_payment` to `active` so they can see class materials.
- **Capacity Guard Brain**: We try registering an 11th student into a class that has a `maxCapacity` of `10`. We verify that the brain immediately rejects the registration (`Class already full!`).

### Level 2: End-to-End Security Tests (`npm run test:e2e`)

These tests inspect the **Front Doors and Security Guards (Controllers & Guards)**:

- Instead of testing internal math, the robot acts like a stranger trying to knock on our API doors (`GET /classes`, `GET /assessments`, `GET /users/me`) without showing a valid ID badge (`Bearer JWT Token`).
- We verify that our security guard (`FirebaseAuthGuard`) immediately blocks the stranger with a `401 Unauthorized` message.

### Level 3: Full Classroom Simulation (`npm run seed`)

While not technically a unit test, this is our **Live Rehearsal**:

- It boots the entire school from scratch in the sandbox: creating 1 Admin, 2 Teachers, 2 Parents, and 3 Students.
- It enrolls students, pays KHR invoices, uploads PDF study materials, marks attendance, and calculates report cards, giving you a complete visual overview of the system in action.

---

## 4. Why Do We Use `Date.now()` inside Tests? (Idempotency)

If you look inside our test files, you will notice code like this:

```typescript
const runId = Date.now();
const classId = `class_full_wf_${runId}`;
```

**Why do we add `runId` (the current exact millisecond timestamp) to our test names?**

Because our test workers run in parallel at lightning speed across multiple CPU cores. If two tests run at the same time and both try to create a student named `"student_1"`, they might collide and fail! By adding the timestamp (`student_assess_wf_1752659000`), every test run gets completely unique, fresh names, guaranteeing **100% clean, clash-free results every time you run them**.

---

## 5. How You Can Run the Tests Yourself

Anytime you make changes or want to verify the system's health, open your terminal and run:

1. **Run all Service Unit & Integration Tests (35+ tests)**:
   ```bash
   cd backend
   npm run test
   ```
2. **Run all Security & Door E2E Tests**:
   ```bash
   cd backend
   npm run test:e2e
   ```
3. **Run Prettier & Linting (Ensure clean code formatting)**:
   ```bash
   cd backend
   npm run lint
   ```
4. **Run the Full Classroom Simulation**:
   ```bash
   cd backend
   npm run seed
   ```
