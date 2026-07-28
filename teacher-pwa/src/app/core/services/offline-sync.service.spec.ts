import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OfflineSyncService } from './offline-sync.service';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), OfflineSyncService],
    });
    service = TestBed.inject(OfflineSyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created and start with empty queue', () => {
    expect(service).toBeTruthy();
    expect(service.pendingCount()).toBe(0);
  });

  it('should add items to queue and update signals', () => {
    service.addToQueue('/attendance/check-in', { classId: 'cls_1' });
    expect(service.pendingCount()).toBe(1);
    expect(service.pendingQueue()[0].endpoint).toBe('/attendance/check-in');
  });

  it('should clear queue when clearQueue is called', () => {
    service.addToQueue('/attendance/check-in', { classId: 'cls_1' });
    expect(service.pendingCount()).toBe(1);
    service.clearQueue();
    expect(service.pendingCount()).toBe(0);
  });
});
