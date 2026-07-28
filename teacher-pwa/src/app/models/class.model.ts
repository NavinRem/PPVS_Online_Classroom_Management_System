export interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  contactNumber?: string;
  principalName?: string;
  status?: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  nameKhmer?: string;
  gender?: string;
  dateOfBirth?: string;
  parentId: string;
  branchId?: string;
  avatarUrl?: string;
}

export interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  roomNumber: string;
  teacherId: string;
  branchId?: string;
  maxStudents: number;
  currentEnrollment: number;
  scheduleDescription?: string;
}
