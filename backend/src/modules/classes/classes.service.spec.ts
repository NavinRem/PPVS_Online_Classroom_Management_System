import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { FirebaseModule } from '../../config/firebase/firebase.module';
import { CreateClassDto } from './dto/create-class.dto';
import { NotFoundException } from '@nestjs/common';

describe('ClassesService (Unit & Integration)', () => {
  let service: ClassesService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FirebaseModule],
      providers: [ClassesService],
    }).compile();

    await module.init();
    service = module.get<ClassesService>(ClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Course Lifecycle (`create`, `findAll`, `findOne`, `update`, `remove`)', () => {
    const runId = Date.now();
    let classDocId: string;

    it('should create a class with currentEnrollment initialized to 0 (`create`)', async () => {
      const dto: CreateClassDto = {
        className: `PPVS Calculus ${runId}`,
        teacherName: 'Sokha Chea',
        teacherId: `teacher_${runId}`,
        day: 'Mon/Wed/Fri',
        time: '8:00 AM - 9:30 AM',
        maxCapacity: 30,
        price: 250000,
        currency: 'KHR',
      };

      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result.message).toContain('successfully');
      classDocId = result.id;

      const fetched = await service.findOne(classDocId);
      expect(fetched).toHaveProperty('className', `PPVS Calculus ${runId}`);
      expect(fetched).toHaveProperty('currentEnrollment', 0);
    });

    it('should find all classes (`findAll`)', async () => {
      const all = await service.findAll();
      expect(Array.isArray(all)).toBe(true);
      const found = all.find((c) => c.id === classDocId);
      expect(found).toBeDefined();
    });

    it('should update class details (`update`)', async () => {
      const result = await service.update(classDocId, { maxCapacity: 35 });
      expect(result).toHaveProperty('id', classDocId);
      const fetched = await service.findOne(classDocId);
      expect(fetched).toHaveProperty('maxCapacity', 35);
    });

    it('should remove a class (`remove`)', async () => {
      const result = await service.remove(classDocId);
      expect(result).toHaveProperty('id', classDocId);
      await expect(service.findOne(classDocId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
