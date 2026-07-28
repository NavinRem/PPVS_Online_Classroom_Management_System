import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

describe('EnrollmentsService (Unit)', () => {
  let service: EnrollmentsService;
  let mockFirebaseService: any;
  let mockEnrollmentsCollection: any;
  let mockClassesCollection: any;
  let mockStudentsCollection: any;

  // Variables for transaction logic tests
  let classDocExists: boolean;
  let classDataObj: any;
  let duplicateCheckEmpty: boolean;

  beforeAll(async () => {
    mockEnrollmentsCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(() => ({
        empty: duplicateCheckEmpty,
        docs: duplicateCheckEmpty
          ? []
          : [
              {
                id: 'enrollment1',
                data: () => ({
                  classId: 'class1',
                  studentId: 'student1',
                  status: 'active',
                  createdAt: '2026-07-15',
                }),
              },
            ],
      })),
      add: jest.fn().mockResolvedValue({ id: 'new_enrollment_id' }),
      doc: jest.fn((docId?: string) => {
        if (
          !docId ||
          docId === 'enrollment1' ||
          docId === 'new_enrollment_id'
        ) {
          return {
            id: docId || 'new_enrollment_id',
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: 'enrollment1',
              data: () => ({
                classId: 'class1',
                studentId: 'student1',
                status: 'active',
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

    mockClassesCollection = {
      doc: jest.fn((docId: string) => {
        return {
          id: docId,
          get: jest.fn().mockResolvedValue({
            exists: classDocExists,
            id: docId,
            data: () => classDataObj,
          }),
        };
      }),
    };

    mockStudentsCollection = {
      doc: jest.fn((docId: string) => {
        return {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: docId,
            data: () => ({ firstName: 'Dara', lastName: 'Sok' }),
          }),
        };
      }),
    };

    const mockTransaction = {
      get: jest.fn(async (ref: { get: () => Promise<any> }) => await ref.get()),
      set: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
    };

    mockFirebaseService = {
      firestore: {
        runTransaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockTransaction);
        }),
        collection: jest.fn((colName: string) => {
          if (colName === 'enrollments') return mockEnrollmentsCollection;
          if (colName === 'classes') return mockClassesCollection;
          if (colName === 'students') return mockStudentsCollection;

          return {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  beforeEach(() => {
    // Reset transaction state variables to success defaults
    classDocExists = true;
    classDataObj = {
      currentEnrollment: 5,
      maxCapacity: 30,
      price: 200000,
      className: 'Biology 101',
      day: 'Monday',
      time: '10:00 AM',
    };
    duplicateCheckEmpty = true;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CRUD Operations', () => {
    it('should create an enrollment (`create`) inside atomic transaction', async () => {
      const dto: CreateEnrollmentDto = {
        classId: 'class1',
        studentId: 'student1',
        parentId: 'parent1',
      };

      const result = await service.create(dto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending_payment'); // because price > 0
      expect(result.message).toContain('successfully enrolled');
      expect(mockFirebaseService.firestore.runTransaction).toHaveBeenCalled();
    });

    it('should create an enrollment with `active` status if class has no price', async () => {
      classDataObj = { currentEnrollment: 5, maxCapacity: 30, price: 0 };

      const dto: CreateEnrollmentDto = {
        classId: 'class1',
        studentId: 'student1',
        parentId: 'parent1',
      };

      const result = await service.create(dto);
      expect(result.status).toBe('active');
    });

    it('should find all enrollments (`findAll`)', async () => {
      duplicateCheckEmpty = false; // ensures mock returns data
      const results = await service.findAll();
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].id).toBe('enrollment1');
    });

    it('should find one enrollment by ID (`findOne`)', async () => {
      const result = await service.findOne('enrollment1');
      expect(result).toHaveProperty('id', 'enrollment1');
      expect(result).toHaveProperty('classId', 'class1');
    });

    it('should update an enrollment status (`update` & `updateStatus`)', async () => {
      const result = await service.updateStatus('enrollment1', 'active');
      expect(result).toHaveProperty('id', 'enrollment1');
    });

    it('should remove an enrollment (`remove`)', async () => {
      const result = await service.remove('enrollment1');
      expect(result).toHaveProperty('id', 'enrollment1');
    });
  });

  describe('Workflow Operations', () => {
    it('should reject enrollment if class does not exist', async () => {
      classDocExists = false;
      const dto: CreateEnrollmentDto = {
        classId: 'classX',
        studentId: 'student1',
        parentId: 'parent1',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject enrollment when class is full (`currentEnrollment >= maxCapacity`)', async () => {
      classDataObj = { currentEnrollment: 30, maxCapacity: 30 }; // Full
      const dto: CreateEnrollmentDto = {
        classId: 'class1',
        studentId: 'student1',
        parentId: 'parent1',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate enrollment when student is already registered in class', async () => {
      duplicateCheckEmpty = false; // Simulate already enrolled
      const dto: CreateEnrollmentDto = {
        classId: 'class1',
        studentId: 'student1',
        parentId: 'parent1',
      };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when transaction throws unknown error', async () => {
      (
        mockFirebaseService.firestore.runTransaction as jest.Mock
      ).mockRejectedValueOnce(new Error('Unknown DB Error'));
      const dto: CreateEnrollmentDto = {
        classId: 'class1',
        studentId: 'student1',
        parentId: 'parent1',
      };
      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should aggregate schedule across enrolled children (`getMySchedule`)', async () => {
      // Setup specific mock for getMySchedule where it searches by parentId
      duplicateCheckEmpty = false; // so enrollmentsSnap has docs
      const schedule = await service.getMySchedule('parent1');

      expect(Array.isArray(schedule)).toBe(true);
      expect(schedule.length).toBe(1);
      expect(schedule[0].studentName).toBe('Dara Sok');
      expect(schedule[0].className).toBe('Biology 101');
      expect(schedule[0].schedule).toBe('Mondays at 10:00 AM');
    });

    it('should return empty schedule if no enrollments found', async () => {
      duplicateCheckEmpty = true;
      const schedule = await service.getMySchedule('parent1');
      expect(schedule).toEqual([]);
    });

    it('should throw InternalServerErrorException when getMySchedule fails', async () => {
      (mockEnrollmentsCollection.get as jest.Mock).mockRejectedValueOnce(
        new Error('DB Query Error'),
      );
      await expect(service.getMySchedule('parent1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
