import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { BatchCheckInDto } from './dto/check-in.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditUserContext } from '../auth/current-user.decorator';

describe('AttendanceController (Unit)', () => {
  let controller: AttendanceController;
  let attendanceService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    batchCheckIn: jest.Mock;
    getClassDateAttendance: jest.Mock;
    getStudentAttendanceHistory: jest.Mock;
    getStudentMonthlyAttendance: jest.Mock;
    getClassMonthlyMetrics: jest.Mock;
  };

  const mockUserContext: AuditUserContext = {
    uid: 'teacher123',
    email: 'teacher@test.kh',
    role: 'teacher',
  };

  beforeEach(async () => {
    attendanceService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      batchCheckIn: jest.fn(),
      getClassDateAttendance: jest.fn(),
      getStudentAttendanceHistory: jest.fn(),
      getStudentMonthlyAttendance: jest.fn(),
      getClassMonthlyMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: attendanceService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Standard CRUD', () => {
    it('should delegate findAll with branchId', async () => {
      attendanceService.findAll.mockResolvedValue([]);
      await controller.findAll('branch1');
      expect(attendanceService.findAll).toHaveBeenCalledWith('branch1');
    });

    it('should delegate findOne', async () => {
      attendanceService.findOne.mockResolvedValue({});
      await controller.findOne('record1');
      expect(attendanceService.findOne).toHaveBeenCalledWith('record1');
    });

    it('should delegate update with context', async () => {
      const dto: UpdateAttendanceDto = { records: [] };
      attendanceService.update.mockResolvedValue({});
      await controller.update('record1', dto, mockUserContext);
      expect(attendanceService.update).toHaveBeenCalledWith('record1', dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });

    it('should delegate remove', async () => {
      attendanceService.remove.mockResolvedValue({});
      await controller.remove('record1');
      expect(attendanceService.remove).toHaveBeenCalledWith('record1');
    });

    it('should delegate batchCheckIn with context', async () => {
      const dto: BatchCheckInDto = {
        classId: 'c1',
        date: '2026-07-15',
        records: [],
      };
      attendanceService.batchCheckIn.mockResolvedValue({});
      await controller.checkIn(dto, mockUserContext);
      expect(attendanceService.batchCheckIn).toHaveBeenCalledWith(dto, {
        uid: 'teacher123',
        role: 'teacher',
      });
    });
  });

  describe('Aggregations and History', () => {
    it('should delegate getClassAttendance with date and user context', async () => {
      attendanceService.getClassDateAttendance.mockResolvedValue({});
      await controller.getClassAttendance(
        'class1',
        '2026-07-15',
        mockUserContext,
      );
      expect(attendanceService.getClassDateAttendance).toHaveBeenCalledWith(
        'class1',
        '2026-07-15',
        'teacher123',
        'teacher',
      );
    });

    it('should delegate getStudentAttendance with context defaults (parent)', async () => {
      const parentContext: AuditUserContext = { uid: 'parent1', email: 'p@kh' };
      attendanceService.getStudentAttendanceHistory.mockResolvedValue({});
      await controller.getStudentAttendance('student1', parentContext);
      expect(
        attendanceService.getStudentAttendanceHistory,
      ).toHaveBeenCalledWith('student1', 'parent1', 'parent');
    });

    it('should delegate getStudentMonthlyAttendance with month query', async () => {
      attendanceService.getStudentMonthlyAttendance.mockResolvedValue({});
      await controller.getStudentMonthlyAttendance(
        'student1',
        mockUserContext,
        '2026-07',
      );
      expect(
        attendanceService.getStudentMonthlyAttendance,
      ).toHaveBeenCalledWith('student1', '2026-07', 'teacher123', 'teacher');
    });

    it('should delegate getClassMonthlyMetrics with month query', async () => {
      attendanceService.getClassMonthlyMetrics.mockResolvedValue({});
      await controller.getClassMonthlyMetrics(
        'class1',
        mockUserContext,
        '2026-07',
      );
      expect(attendanceService.getClassMonthlyMetrics).toHaveBeenCalledWith(
        'class1',
        '2026-07',
        'teacher123',
        'teacher',
      );
    });
  });
});
