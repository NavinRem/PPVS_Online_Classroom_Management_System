import { Test, TestingModule } from '@nestjs/testing';
import { TeachersService } from './teachers.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('TeachersService (Unit)', () => {
  let service: TeachersService;
  let mockFirebaseService: any;
  const teacherUid = 'teacher_123';
  const classId = 'class_123';

  beforeAll(async () => {
    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'teachers') {
            return {
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                docs: [],
              }),
              add: jest.fn().mockResolvedValue({ id: 'new_teacher_id' }),
              doc: jest.fn((docId: string) => {
                if (docId === 'teacher_123' || docId === 'new_teacher_id') {
                  return {
                    get: jest.fn().mockResolvedValue({
                      exists: true,
                      id: docId,
                      data: () => ({
                        fullName: 'Sokha Chea',
                        specialization: 'Mathematics',
                      }),
                    }),
                    set: jest.fn().mockResolvedValue(true),
                    update: jest.fn().mockResolvedValue(true),
                    delete: jest.fn().mockResolvedValue(true),
                  };
                }
                return {
                  get: jest.fn().mockResolvedValue({ exists: false }),
                  delete: jest.fn().mockResolvedValue(true),
                };
              }),
            };
          }
          if (colName === 'classes') {
            return {
              where: jest.fn().mockReturnThis(),
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: classId,
                    data: () => ({
                      name: 'Advanced Algebra',
                      teacherId: teacherUid,
                    }),
                  },
                ],
              }),
            };
          }
          // Default fallback
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            add: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              set: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              update: jest.fn().mockRejectedValue(new Error('Mock Offline')),
              delete: jest.fn().mockRejectedValue(new Error('Mock Offline')),
            }),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Teacher Lifecycle & Assigned Classes', () => {
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
      expect(result).toHaveProperty('id', 'new_teacher_id');
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
      const assigned = await service.getAssignedClasses(teacherUid);
      expect(Array.isArray(assigned)).toBe(true);
      const found = assigned.find((c) => c.id === classId);
      expect(found).toBeDefined();
      expect(found).toHaveProperty('name', 'Advanced Algebra');
    });

    it('should throw InternalServerErrorException if getAssignedClasses query fails', async () => {
      jest
        .spyOn(mockFirebaseService.firestore, 'collection')
        .mockImplementationOnce(() => {
          throw new Error('Database down');
        });

      await expect(service.getAssignedClasses(teacherUid)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should update a teacher profile (`update`)', async () => {
      const result = await service.update(createdDocId, {
        specialization: 'Physics',
      });
      expect(result).toHaveProperty('id', createdDocId);
    });

    it('should remove a teacher profile (`remove`)', async () => {
      const result = await service.remove(createdDocId);
      expect(result).toHaveProperty('id', createdDocId);

      // Attempt to find a deleted doc (we can test with a fake unknown id)
      await expect(service.findOne('unknown_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
