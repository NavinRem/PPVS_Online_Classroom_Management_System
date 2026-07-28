import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AttendanceService } from './attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { ClassInfo, StudentInfo } from '../../models/class.model';
import { AttendanceStatus, BatchCheckInPayload } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './attendance-check-in.component.html',
  styleUrl: './attendance-check-in.component.scss',
})
export class AttendanceCheckInComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private attendanceService = inject(AttendanceService);
  readonly authService = inject(AuthService);
  readonly offlineSync = inject(OfflineSyncService);

  readonly classes = signal<ClassInfo[]>([]);
  readonly selectedClassId = signal<string>('');
  readonly students = signal<StudentInfo[]>([]);
  readonly studentStatuses = signal<Record<string, AttendanceStatus>>({});
  readonly attendanceDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly statusMessage = signal<string>('');
  readonly isStatusSuccess = signal<boolean>(true);

  readonly statuses: {
    value: AttendanceStatus;
    label: string;
    icon: string;
    colorClass: string;
  }[] = [
    {
      value: 'present',
      label: 'Present',
      icon: '✅',
      colorClass: 'status-present',
    },
    {
      value: 'homeworked',
      label: 'Homeworked',
      icon: '📚',
      colorClass: 'status-homeworked',
    },
    {
      value: 'permission',
      label: 'Permission',
      icon: '📝',
      colorClass: 'status-permission',
    },
    {
      value: 'absent',
      label: 'Absent',
      icon: '❌',
      colorClass: 'status-absent',
    },
  ];

  ngOnInit(): void {
    const classIdFromUrl = this.route.snapshot.paramMap.get('id');
    this.loadClasses(classIdFromUrl || undefined);
  }

  loadClasses(initialClassId?: string): void {
    const user = this.authService.currentUser();
    const teacherId = user?.uid || 'teacher_user_001';
    const branchId = user?.branchId;

    this.attendanceService.getClassesForTeacher(teacherId, branchId).subscribe({
      next: (data) => {
        this.classes.set(data);
        if (initialClassId && data.some((c) => c.id === initialClassId)) {
          this.selectClass(initialClassId);
        } else if (data.length > 0) {
          this.selectClass(data[0].id);
        }
      },
    });
  }

  selectClass(classId: string): void {
    this.selectedClassId.set(classId);
    this.statusMessage.set('');
    this.loadStudentsForClass(classId);
  }

  loadStudentsForClass(classId: string): void {
    if (!classId) return;
    this.isLoading.set(true);

    this.attendanceService.getStudentsForClass(classId).subscribe({
      next: (roster) => {
        this.students.set(roster);
        const defaultMap: Record<string, AttendanceStatus> = {};
        roster.forEach((student) => {
          defaultMap[student.id] = 'present';
        });
        this.studentStatuses.set(defaultMap);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.statusMessage.set('Failed to load student roster.');
        this.isStatusSuccess.set(false);
      },
    });
  }

  setStatus(studentId: string, status: AttendanceStatus): void {
    this.studentStatuses.update((map) => ({
      ...map,
      [studentId]: status,
    }));
  }

  setAllStatuses(status: AttendanceStatus): void {
    const roster = this.students();
    const updatedMap: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      updatedMap[s.id] = status;
    });
    this.studentStatuses.set(updatedMap);
  }

  getCountForStatus(status: AttendanceStatus): number {
    const map = this.studentStatuses();
    return Object.values(map).filter((s) => s === status).length;
  }

  submitAttendance(): void {
    const classId = this.selectedClassId();
    if (!classId) return;

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    const map = this.studentStatuses();
    const records = Object.entries(map).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    const payload: BatchCheckInPayload = {
      classId,
      date: this.attendanceDate(),
      records,
      branchId: this.authService.currentUser()?.branchId || 'branch_pp_01',
    };

    this.attendanceService.batchCheckIn(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.status === 'offline_queued') {
          this.statusMessage.set('📡 Offline Mode: Attendance saved locally to device sync queue.');
          this.isStatusSuccess.set(true);
        } else {
          this.statusMessage.set(
            `✅ Check-in submitted successfully! (${records.length} students recorded)`,
          );
          this.isStatusSuccess.set(true);
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.statusMessage.set('Error submitting attendance.');
        this.isStatusSuccess.set(false);
      },
    });
  }
}
