import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'teacher',
    loadComponent: () =>
      import('./layout/portal-layout/portal-layout.component').then((m) => m.PortalLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/teacher/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance-check-in.component').then(
            (m) => m.AttendanceCheckInComponent,
          ),
      },
      {
        path: 'attendance/:id',
        loadComponent: () =>
          import('./features/attendance/attendance-check-in.component').then(
            (m) => m.AttendanceCheckInComponent,
          ),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./features/teacher/assessments/score-entry.component').then(
            (m) => m.ScoreEntryComponent,
          ),
      },
      {
        path: 'assessments/:id',
        loadComponent: () =>
          import('./features/teacher/assessments/score-entry.component').then(
            (m) => m.ScoreEntryComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'parent',
    loadComponent: () =>
      import('./layout/portal-layout/portal-layout.component').then((m) => m.PortalLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/teacher/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance-check-in.component').then(
            (m) => m.AttendanceCheckInComponent,
          ),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./features/teacher/assessments/score-entry.component').then(
            (m) => m.ScoreEntryComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'student',
    loadComponent: () =>
      import('./layout/portal-layout/portal-layout.component').then((m) => m.PortalLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/teacher/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance-check-in.component').then(
            (m) => m.AttendanceCheckInComponent,
          ),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./features/teacher/assessments/score-entry.component').then(
            (m) => m.ScoreEntryComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./layout/portal-layout/portal-layout.component').then((m) => m.PortalLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/teacher/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
