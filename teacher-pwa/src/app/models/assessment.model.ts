export interface AssessmentInfo {
  id: string;
  classId: string;
  title: string;
  description?: string;
  type?: 'quiz' | 'homework' | 'midterm' | 'final' | 'project' | string;
  maxScore: number;
  weight?: number;
  weightPercentage?: number;
  date?: string;
  dueDate?: string;
  branchId?: string;
}

export interface GradeRecord {
  studentId: string;
  assessmentId: string;
  score: number;
  feedback?: string;
  gradedBy?: string;
  branchId?: string;
}

export interface ScoreBatchPayload {
  assessmentId: string;
  records: GradeRecord[];
}
