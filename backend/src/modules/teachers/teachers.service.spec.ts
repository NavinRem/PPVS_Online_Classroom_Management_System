import { Test, TestingModule } from '@nestjs/testing';
import { TeachersService } from './teachers.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { NotFoundException } from '@nestjs/common';

describe('TeachersService (Unit & Integration)', () => {
  let service: TeachersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [TeachersService],
    }).compile();

    await module.init();
    service = module.get<TeachersService>(TeachersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Teacher Lifecycle & Assigned Classes (`getAssignedClasses`, `findByUid`, CRUD)', () => {
    const runId = Date.now();
    const teacherUid = `teacher_uid_${runId}`;
    let createdDocId: string;

    it('should create a teacher profile (`create`)', async () => {
      const dto: CreateTeacherDto = {
        uid: teacherUid,
        fullName: 'Sokha Chea',
        email: 'sokha.teacher@ppvs.edu.kh',
        phoneNumber: '+85512345678',
        specialization: 'Mathematics',
        bio: 'Senior high school math teacher',
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      createdDocId = result.id;
      const fetched = await service.findOne(createdDocId);
      expect(fetched).toHaveProperty('fullName', 'Sokha Chea');
    });

    it('should find teacher profile by UID or Doc ID (`findByUid` & `findOne`)', async () => {
      const result = await service.findByUid(createdDocId);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', createdDocId);
      expect(result).toHaveProperty('specialization', 'Mathematics');
    });

    it('should retrieve assigned classes (`getAssignedClasses`)', async () => {
      const classId = `class_for_teacher_${runId}`;
      await service.firebase.firestore.collection('classes').doc(classId).set({
        name: 'Advanced Algebra',
        teacherId: teacherUid,
        createdAt: new Date().toISOString(),
      });

      const assigned = await service.getAssignedClasses(teacherUid);
      expect(Array.isArray(assigned)).toBe(true);
      const found = assigned.find((c) => c.id === classId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('name', 'Advanced Algebra');
    });

    it('should update a teacher profile (`update`)', async () => {
      const result = await service.update(createdDocId, {
        specialization: 'Physics',
      });
      expect(result).toHaveProperty('id', createdDocId);
      const fetched = await service.findOne(createdDocId);
      expect(fetched).toHaveProperty('specialization', 'Physics');
    });

    it('should remove a teacher profile (`remove`)', async () => {
      const result = await service.remove(createdDocId);
      expect(result).toHaveProperty('id', createdDocId);
      await expect(service.findOne(createdDocId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
