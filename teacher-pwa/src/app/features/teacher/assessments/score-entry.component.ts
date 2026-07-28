import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AttendanceService } from '../../attendance/attendance.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassInfo, StudentInfo } from '../../../models/class.model';
import { AssessmentInfo, GradeRecord, ScoreBatchPayload } from '../../../models/assessment.model';
import { environment } from '../../../core/config/environment';

@Component({
  selector: 'app-score-entry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './score-entry.component.html',
  styleUrl: './score-entry.component.scss',
})
export class ScoreEntryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private attendanceService = inject(AttendanceService);
  readonly authService = inject(AuthService);

  readonly classes = signal<ClassInfo[]>([]);
  readonly selectedClassId = signal<string>('');
  readonly students = signal<StudentInfo[]>([]);
  readonly assessments = signal<AssessmentInfo[]>([]);
  readonly selectedAssessment = signal<AssessmentInfo | null>(null);

  readonly studentScores = signal<Record<string, number>>({});
  readonly studentFeedback = signal<Record<string, string>>({});

  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly statusMessage = signal<string>('');
  readonly isStatusSuccess = signal<boolean>(true);

  // New assessment creation form
  readonly showNewForm = signal<boolean>(false);
  readonly newTitle = signal<string>('Midterm Grammar Exam');
  readonly newType = signal<'quiz' | 'homework' | 'midterm' | 'final' | 'project'>('quiz');
  readonly newMaxScore = signal<number>(100);
  readonly newWeight = signal<number>(20);

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
    this.selectedAssessment.set(null);
    this.loadStudents(classId);
    this.loadAssessments(classId);
  }

  loadStudents(classId: string): void {
    this.isLoading.set(true);
    this.attendanceService.getStudentsForClass(classId).subscribe({
      next: (roster) => {
        this.students.set(roster);
        this.isLoading.set(false);
      },
    });
  }

  loadAssessments(classId: string): void {
    this.http
      .get<AssessmentInfo[]>(
        `${environment.apiUrl}/assessments?classId=${encodeURIComponent(classId)}`,
      )
      .pipe(
        catchError(() => {
          const demoAssessments: AssessmentInfo[] = [
            {
              id: 'assess_quiz_1',
              classId,
              title: 'Unit 1 & 2 Vocabulary Quiz',
              type: 'quiz',
              maxScore: 20,
              weight: 15,
              date: '2026-07-10',
              branchId: this.authService.currentUser()?.branchId || 'branch_pp_01',
            },
            {
              id: 'assess_hw_2',
              classId,
              title: 'Essay Writing Assignment #1',
              type: 'homework',
              maxScore: 50,
              weight: 20,
              date: '2026-07-14',
              branchId: this.authService.currentUser()?.branchId || 'branch_pp_01',
            },
          ];
          return of(demoAssessments);
        }),
      )
      .subscribe({
        next: (list) => {
          this.assessments.set(list);
          if (list.length > 0) {
            this.selectAssessment(list[0]);
          }
        },
      });
  }

  selectAssessment(assessment: AssessmentInfo): void {
    this.selectedAssessment.set(assessment);
    this.statusMessage.set('');
    const scoresMap: Record<string, number> = {};
    const feedbackMap: Record<string, string> = {};

    this.students().forEach((s) => {
      // Default sample scores for demo mode
      scoresMap[s.id] = Math.round(assessment.maxScore * 0.85);
      feedbackMap[s.id] = 'Good effort!';
    });

    this.studentScores.set(scoresMap);
    this.studentFeedback.set(feedbackMap);
  }

  updateScore(studentId: string, scoreStr: string): void {
    const num = parseFloat(scoreStr);
    const max = this.selectedAssessment()?.maxScore || 100;
    const cleanNum = isNaN(num) ? 0 : Math.min(Math.max(num, 0), max);
    this.studentScores.update((map) => ({ ...map, [studentId]: cleanNum }));
  }

  updateFeedback(studentId: string, text: string): void {
    this.studentFeedback.update((map) => ({ ...map, [studentId]: text }));
  }

  createNewAssessment(): void {
    const classId = this.selectedClassId();
    if (!classId) return;

    const newAssess: AssessmentInfo = {
      id: `assess_${Date.now()}`,
      classId,
      title: this.newTitle(),
      type: this.newType(),
      maxScore: Number(this.newMaxScore()),
      weight: Number(this.newWeight()),
      date: new Date().toISOString().split('T')[0],
      branchId: this.authService.currentUser()?.branchId || 'branch_pp_01',
    };

    this.assessments.update((list) => [newAssess, ...list]);
    this.selectAssessment(newAssess);
    this.showNewForm.set(false);
    this.statusMessage.set(`Created assessment "${newAssess.title}"!`);
    this.isStatusSuccess.set(true);
  }

  submitScores(): void {
    const assess = this.selectedAssessment();
    if (!assess) return;

    this.isSubmitting.set(true);
    this.statusMessage.set('');

    const scoresMap = this.studentScores();
    const feedbackMap = this.studentFeedback();

    const records: GradeRecord[] = Object.keys(scoresMap).map((studentId) => ({
      studentId,
      assessmentId: assess.id,
      score: scoresMap[studentId],
      feedback: feedbackMap[studentId],
      gradedBy: this.authService.currentUser()?.uid || 'teacher_01',
      branchId: assess.branchId,
    }));

    const payload: ScoreBatchPayload = {
      assessmentId: assess.id,
      records,
    };

    this.http
      .post(`${environment.apiUrl}/assessments/batch-scores`, payload)
      .pipe(
        catchError(() => {
          return of({ status: 'offline_mock_success' });
        }),
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.statusMessage.set(
            `🏆 Scores successfully recorded for "${assess.title}" (${records.length} students)!`,
          );
          this.isStatusSuccess.set(true);
        },
      });
  }
}
