import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AttendanceService } from '../../attendance/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassInfo } from '../../../models/class.model';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private attendanceService = inject(AttendanceService);
  readonly authService = inject(AuthService);

  readonly classes = signal<ClassInfo[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const user = this.authService.currentUser();
    const teacherId = user?.uid || 'teacher_user_001';
    const branchId = user?.branchId;

    this.attendanceService.getClassesForTeacher(teacherId, branchId).subscribe({
      next: (data) => {
        this.classes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load classes. Please check connection.');
        this.isLoading.set(false);
      },
    });
  }

  getTotalStudents(): number {
    return this.classes().reduce((sum, cls) => sum + cls.currentEnrollment, 0);
  }
}
