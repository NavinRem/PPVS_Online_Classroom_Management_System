import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { BadRequestException } from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

describe('EnrollmentsService (Unit & Integration)', () => {
  let service: EnrollmentsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [EnrollmentsService],
    }).compile();

    await module.init();
    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations (`create`, `findAll`, `findOne`, `update`, `remove`)', () => {
    let enrollmentId: string;
    const testClassId = 'class_enroll_crud_1';
    const testStudentId = 'student_enroll_crud_1';

    beforeAll(async () => {
      // Seed target class doc so transaction succeeds
      await service['firebase'].firestore
        .collection('classes')
        .doc(testClassId)
        .set({
          className: 'Biology 101',
          maxCapacity: 30,
          currentEnrollment: 5,
          price: 200000,
          day: 'Monday',
          time: '10:00 AM',
        });
      // Seed student doc for schedule tests
      await service['firebase'].firestore
        .collection('students')
        .doc(testStudentId)
        .set({
          firstName: 'Dara',
          lastName: 'Sok',
          parentId: 'parent_enroll_crud_1',
        });
    });

    it('should create an enrollment (`create`) inside atomic transaction', async () => {
      const dto: CreateEnrollmentDto = {
        classId: testClassId,
        studentId: testStudentId,
        parentId: 'parent_enroll_crud_1',
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending_payment');
      expect(result.message).toContain('successfully enrolled');
      enrollmentId = result.id;
    });

    it('should find all enrollments (`findAll`)', async () => {
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      const found = results.find((r) => r.id === enrollmentId);
      expect(found).toBeDefined();
    });

    it('should find one enrollment by ID (`findOne`)', async () => {
      const result = await service.findOne(enrollmentId);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', enrollmentId);
      expect(result).toHaveProperty('classId', testClassId);
    });

    it('should update an enrollment status (`update` & `updateStatus`)', async () => {
      const result = await service.updateStatus(enrollmentId, 'active');
      expect(result).toHaveProperty('id', enrollmentId);
      expect(result.message).toContain('successfully updated');
      const fetched = (await service.findOne(enrollmentId)) as any;
      expect(fetched.status).toBe('active');
    });

    it('should remove an enrollment (`remove`)', async () => {
      const result = await service.remove(enrollmentId);
      expect(result).toHaveProperty('id', enrollmentId);
      expect(result.message).toContain('successfully deleted');
    });
  });

  describe('Workflow Operations (`capacity validation`, `duplicate check`, `getMySchedule`)', () => {
    const runId = Date.now();
    const fullClassId = `class_full_wf_${runId}`;

    beforeAll(async () => {
      // Seed full class
      await service['firebase'].firestore
        .collection('classes')
        .doc(fullClassId)
        .set({
          className: 'Advanced Physics (Full)',
          maxCapacity: 10,
          currentEnrollment: 10,
          price: 300000,
        });
    });

    it('should reject enrollment when class is full (`currentEnrollment >= maxCapacity`)', async () => {
      const dto: CreateEnrollmentDto = {
        classId: fullClassId,
        studentId: `student_new_${runId}`,
        parentId: `parent_new_${runId}`,
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate enrollment when student is already registered in class', async () => {
      const classId = `class_dup_wf_${runId}`;
      const studentId = `student_dup_${runId}`;
      await service['firebase'].firestore
        .collection('classes')
        .doc(classId)
        .set({
          className: 'Chemistry 101',
          maxCapacity: 20,
          currentEnrollment: 2,
          price: 150000,
        });

      const dto: CreateEnrollmentDto = {
        classId,
        studentId,
        parentId: `parent_dup_${runId}`,
      };
      await service.create(dto); // First registration succeeds
      await expect(service.create(dto)).rejects.toThrow(BadRequestException); // Second throws
    });

    it('should aggregate schedule across enrolled children (`getMySchedule`)', async () => {
      const schedule = await service.getMySchedule('parent_enroll_crud_1');
      expect(Array.isArray(schedule)).toBe(true);
    });
  });
});
