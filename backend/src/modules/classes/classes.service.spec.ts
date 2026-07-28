import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { FirebaseService } from '../../config/firebase/firebase.service';
import { CreateClassDto } from './dto/create-class.dto';
import { NotFoundException } from '@nestjs/common';

describe('ClassesService (Unit)', () => {
  let service: ClassesService;
  let mockFirebaseService: any;
  let mockClassesCollection: any;

  beforeAll(async () => {
    mockClassesCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            id: 'existing_class_id',
            data: () => ({
              className: 'PPVS Existing',
              currentEnrollment: 0,
            }),
          },
        ],
      }),
      add: jest.fn().mockResolvedValue({ id: 'new_class_id' }),
      doc: jest.fn((docId: string) => {
        if (docId === 'existing_class_id' || docId === 'new_class_id') {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: docId,
              data: () => ({
                className: 'PPVS Mocked',
                currentEnrollment: 0,
                maxCapacity: 35,
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

    mockFirebaseService = {
      firestore: {
        collection: jest.fn((colName: string) => {
          if (colName === 'classes') {
            return mockClassesCollection;
          }
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
        ClassesService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Course Lifecycle (`create`, `findAll`, `findOne`, `update`, `remove`)', () => {
    let classDocId: string;

    it('should create a class with currentEnrollment initialized to 0 (`create`)', async () => {
      const dto: CreateClassDto = {
        className: `PPVS Calculus`,
        teacherName: 'Sokha Chea',
        teacherId: `teacher_123`,
        day: 'Mon/Wed/Fri',
        time: '8:00 AM - 9:30 AM',
        maxCapacity: 30,
        price: 250000,
        currency: 'KHR',
      };

      const result = await service.create(dto);
      expect(result).toHaveProperty('id', 'new_class_id');
      expect(result.message).toContain('successfully');
      classDocId = result.id;

      // Because we mocked doc(id).get() to return static data,
      // we just verify that the collection.add was called with currentEnrollment: 0
      expect(mockClassesCollection.add as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          className: 'PPVS Calculus',
          currentEnrollment: 0,
        }),
      );
    });

    it('should find all classes (`findAll`)', async () => {
      const all = await service.findAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);
    });

    it('should update class details (`update`)', async () => {
      const result = await service.update(classDocId, { maxCapacity: 35 });
      expect(result).toHaveProperty('id', classDocId);
    });

    it('should remove a class (`remove`)', async () => {
      const result = await service.remove(classDocId);
      expect(result).toHaveProperty('id', classDocId);

      await expect(service.findOne('unknown_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
