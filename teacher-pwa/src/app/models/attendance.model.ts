export type AttendanceStatus = 'present' | 'homeworked' | 'permission' | 'absent';

export interface StudentAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BatchCheckInPayload {
  classId: string;
  date: string; // YYYY-MM-DD
  records: StudentAttendanceRecord[];
  branchId?: string;
}

export interface BatchCheckInResponse {
  message?: string;
  status?: string;
  recordsProcessed?: number;
}

export interface OfflineQueueItem<T = unknown> {
  id: string;
  timestamp: number;
  endpoint: string;
  payload: T;
}
