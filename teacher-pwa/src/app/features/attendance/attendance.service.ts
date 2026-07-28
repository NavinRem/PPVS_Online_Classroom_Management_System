import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BatchCheckInPayload, BatchCheckInResponse } from '../../models/attendance.model';
import { ClassInfo, StudentInfo } from '../../models/class.model';
import { environment } from '../../core/config/environment';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private http = inject(HttpClient);
  private offlineSync = inject(OfflineSyncService);

  getClassesForTeacher(teacherId: string, branchId?: string): Observable<ClassInfo[]> {
    let url = `${environment.apiUrl}/classes?teacherId=${encodeURIComponent(teacherId)}`;
    if (branchId) {
      url += `&branchId=${encodeURIComponent(branchId)}`;
    }
    return this.http.get<ClassInfo[]>(url).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`Failed to load classes for teacher ${teacherId}:`, error);
        return throwError(() => error);
      }),
    );
  }

  getStudentsForClass(classId: string): Observable<StudentInfo[]> {
    return this.http.get<StudentInfo[]>(`${environment.apiUrl}/classes/${classId}/students`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`Failed to load student roster for class ${classId}:`, error);
        return throwError(() => error);
      }),
    );
  }

  batchCheckIn(payload: BatchCheckInPayload): Observable<BatchCheckInResponse> {
    if (!this.offlineSync.isOnline()) {
      this.offlineSync.addToQueue('/attendance/check-in', payload);
      return of({
        status: 'offline_queued',
        message: 'Saved to device offline queue',
        recordsProcessed: payload.records.length,
      });
    }

    return this.http
      .post<BatchCheckInResponse>(`${environment.apiUrl}/attendance/check-in`, payload)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 0 || !this.offlineSync.isOnline()) {
            this.offlineSync.addToQueue('/attendance/check-in', payload);
            return of({
              status: 'offline_queued',
              message: 'Network unreachable. Saved to device offline queue.',
              recordsProcessed: payload.records.length,
            });
          }
          return throwError(() => error);
        }),
      );
  }
}
