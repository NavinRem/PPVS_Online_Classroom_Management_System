import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AttendanceService } from './attendance.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { BatchCheckInPayload } from '../../models/attendance.model';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;
  let offlineSync: OfflineSyncService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AttendanceService,
        OfflineSyncService,
      ],
    });
    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
    offlineSync = TestBed.inject(OfflineSyncService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should queue batchCheckIn when browser is offline', () => {
    offlineSync.isOnline.set(false);

    const payload: BatchCheckInPayload = {
      classId: 'cls_01',
      date: '2026-07-17',
      records: [{ studentId: 'stud_1', status: 'present' }],
    };

    let resultStatus = '';
    service.batchCheckIn(payload).subscribe((res) => {
      resultStatus = res.status || '';
    });

    expect(resultStatus).toBe('offline_queued');
    expect(offlineSync.pendingCount()).toBe(1);
  });

  it('should call POST /attendance/check-in when online', () => {
    offlineSync.isOnline.set(true);

    const payload: BatchCheckInPayload = {
      classId: 'cls_01',
      date: '2026-07-17',
      records: [{ studentId: 'stud_1', status: 'present' }],
    };

    service.batchCheckIn(payload).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/attendance/check-in');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: 'success', recordsProcessed: 1 });
  });
});
