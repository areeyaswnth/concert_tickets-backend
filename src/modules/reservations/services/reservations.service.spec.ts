import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { getModelToken } from '@nestjs/mongoose';
import { Concert, ConcertDocument, ConcertSchema } from '../../concerts/entities/concert.entity';
import { Reservation, ReserveDocument, ReservationSchema } from '../entities/reservations.entity';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Types } from 'mongoose';
import { ReservationStatus } from '../../../common/enum/reserve-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserDocument, UserSchema, User } from '../../../modules/users/entities/user.entity';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mongod: MongoMemoryServer;
  let concertModel: Model<ConcertDocument>;
  let reserveModel: Model<ReserveDocument>;
  let userModel: Model<UserDocument>;

  const toIdString = (id: Types.ObjectId | unknown) => (id as Types.ObjectId).toString();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getModelToken(Concert.name),
          useValue: mongoose.model(Concert.name, ConcertSchema),
        },
        {
          provide: getModelToken(Reservation.name),
          useValue: mongoose.model(Reservation.name, ReservationSchema),
        },
        {
          provide: getModelToken(User.name),
          useValue: mongoose.model(User.name, UserSchema),
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    concertModel = module.get<Model<ConcertDocument>>(getModelToken(Concert.name));
    reserveModel = module.get<Model<ReserveDocument>>(getModelToken(Reservation.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await concertModel.deleteMany({});
    await reserveModel.deleteMany({});
    await userModel.deleteMany({});
  });

  it('should reserve a seat successfully', async () => {
    const user = await userModel.create({
      name: 'Test User for reserve a seat successfully',
      email: 'test7@example.com',
      password: '123456',
    } as UserDocument);

    const concert = await concertModel.create({ name: 'C1', description: 'D1', maxSeats: 100 } as ConcertDocument);
    const userId = user._id.toString()
    const reserve = await service.reserveSeat(userId, toIdString(concert._id));

    expect(toIdString(reserve.concertId)).toBe(toIdString(concert._id));
    expect(reserve.status).toBe(ReservationStatus.CONFIRMED);
  });

  it('should throw error if concert not found', async () => {
    await expect(service.reserveSeat(new Types.ObjectId().toString(), new Types.ObjectId().toString()))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw error on duplicate reservation', async () => {
    const userId = new Types.ObjectId().toString();
    const concertId = new Types.ObjectId().toString();

    jest.spyOn(userModel, 'findById').mockResolvedValueOnce({ _id: userId });
    jest.spyOn(concertModel, 'findById').mockResolvedValueOnce({ _id: concertId, status: 'ACTIVE' });

    jest.spyOn(reserveModel, 'findOne').mockResolvedValueOnce({ _id: new Types.ObjectId() });

    await expect(service.reserveSeat(userId, concertId))
      .rejects.toThrow(new BadRequestException('User already reserved a seat'));
  });
  it('should throw BadRequestException if concert is full', async () => {
    const user1 = await userModel.create({ name: 'User 1', email: 'u1@test.com', password: '123456' } as UserDocument);
    const user2 = await userModel.create({ name: 'User 2', email: 'u2@test.com', password: '123456' } as UserDocument);

    const concert = await concertModel.create({ name: 'Full Concert', description: 'D', maxSeats: 1 } as ConcertDocument);
    const concertId = String(concert._id)
    await service.reserveSeat(user1._id.toString(), concertId);
    await expect(service.reserveSeat(user2._id.toString(), concertId))
      .rejects.toThrow(new BadRequestException('No seats available'));
  });


  it('should throw NotFoundException if user does not exist', async () => {
    jest.spyOn(userModel, 'findById').mockResolvedValueOnce(null);

    await expect(
      service.reserveSeat(new Types.ObjectId().toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow(new NotFoundException('User not found'));
  });

  it('should throw NotFoundException if concert does not exist', async () => {
    jest.spyOn(userModel, 'findById').mockResolvedValueOnce({ _id: new Types.ObjectId() });
    jest.spyOn(concertModel, 'findById').mockResolvedValueOnce(null);

    await expect(
      service.reserveSeat(new Types.ObjectId().toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow(new NotFoundException('Concert not found'));
  });

  it('should throw BadRequestException if concert is cancelled', async () => {
    jest.spyOn(userModel, 'findById').mockResolvedValueOnce({ _id: new Types.ObjectId() });
    jest.spyOn(concertModel, 'findById').mockResolvedValueOnce({
      _id: new Types.ObjectId(),
      status: ConcertStatus.CANCELED,
    });
    await expect(
      service.reserveSeat(new Types.ObjectId().toString(), new Types.ObjectId().toString()),
    ).rejects.toThrow(new BadRequestException('This concert has been cancelled'));
  });

  it('should cancel a reservation successfully', async () => {
    const user = await userModel.create({
      name: 'Test User',
      email: 'test7@example.com',
      password: '123456',
    } as UserDocument);

    const concert = await concertModel.create({
      name: 'C6',
      description: 'D6',
      maxSeats: 100,
    } as ConcertDocument);

    await reserveModel.create({
      concertId: concert._id,
      userId: user._id,
      status: ReservationStatus.CONFIRMED,
    } as ReserveDocument);

    const res = await service.getListReservation(1, 10);

    expect(res.data).toHaveLength(1);

    const concertData = res.data[0].concertId as unknown as ConcertDocument;
    expect(concertData.name).toBe('C6');

    const userData = res.data[0].userId as unknown as UserDocument;
    expect(userData.name).toBe('Test User');
  });
  it('should throw NotFoundException if user does not exist', async () => {
    const userId = new Types.ObjectId().toString();
    const concertId = new Types.ObjectId().toString();

    jest.spyOn(userModel, 'findById').mockResolvedValueOnce(null);

    await expect(service.cancelReserve(userId, concertId))
      .rejects.toThrow(new NotFoundException('User not found'));
  });

  it('should throw NotFoundException if concert does not exist', async () => {
    const user = await userModel.create({ name: 'Test', email: 'test@example.com', password: '123456' } as UserDocument);
    const concertId = new Types.ObjectId().toString();

    jest.spyOn(concertModel, 'findById').mockResolvedValueOnce(null);

    await expect(service.cancelReserve(user._id.toString(), concertId))
      .rejects.toThrow(new NotFoundException('Concert not found'));
  });

  it('should throw NotFoundException if reservation does not exist', async () => {
    const user = await userModel.create({ name: 'Test', email: 'test@example.com', password: '123456' } as UserDocument);
    const concert = await concertModel.create({ name: 'Concert', description: 'D', maxSeats: 50 } as ConcertDocument);

    jest.spyOn(reserveModel, 'findOne').mockResolvedValueOnce(null);
    const concertId = String(concert._id)
    await expect(service.cancelReserve(user._id.toString(), concertId.toString()))
      .rejects.toThrow(new NotFoundException('Reservation not found'));
  });



  it('should get user reservations', async () => {
    const user = await userModel.create({
      name: 'Test User getreserve',
      email: 'test7@example.com',
      password: '123456',
    } as UserDocument);
    const concert = await concertModel.create({ name: 'C4', description: 'D4', maxSeats: 60 } as ConcertDocument);
    const userId = user._id.toString();
    await service.reserveSeat(userId, toIdString(concert._id));

    const list = await service.getUserReservations(userId);
    expect(list).toHaveLength(1);
    expect(toIdString(list[0].concertId._id)).toBe(toIdString(concert._id));
  });
  describe('getListReservation', () => {
    it('should return paginated reservations with populated user and concert', async () => {
      const user1 = await userModel.create({ name: 'User1', email: 'u1@test.com', password: '123456' } as UserDocument);
      const user2 = await userModel.create({ name: 'User2', email: 'u2@test.com', password: '123456' } as UserDocument);

      const concert1 = await concertModel.create({ name: 'Concert1', description: 'D1', maxSeats: 50 } as ConcertDocument);
      const concert2 = await concertModel.create({ name: 'Concert2', description: 'D2', maxSeats: 50 } as ConcertDocument);

      await reserveModel.create({ userId: user1._id, concertId: concert1._id, status: 'CONFIRMED' } as ReserveDocument);
      await reserveModel.create({ userId: user2._id, concertId: concert2._id, status: 'CONFIRMED' } as ReserveDocument);

      const result = await service.getListReservation(1, 1);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(1);
      expect(result.meta.totalPages).toBe(2);
      const resItem = result.data[0];

      const userPopulated = resItem.userId as unknown as { name: string };
      const concertPopulated = resItem.concertId as unknown as { name: string };

      expect(userPopulated.name).toBeDefined();
      expect(concertPopulated.name).toBeDefined();

    });

    it('should default to page=1 and limit=10 if invalid', async () => {
      const result = await service.getListReservation(-5, -10);

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should return correct totalPages when total < limit', async () => {
      await reserveModel.deleteMany({});

      const user = await userModel.create({ name: 'SingleUser', email: 'single@test.com', password: '123456' } as UserDocument);
      const concert = await concertModel.create({ name: 'SingleConcert', description: 'D', maxSeats: 50 } as ConcertDocument);

      await reserveModel.create({ userId: user._id, concertId: concert._id, status: 'CONFIRMED' } as ReserveDocument);

      const result = await service.getListReservation(1, 10);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });


  it('should throw BadRequestException if user already reserved', async () => {
    const userId = new Types.ObjectId().toString();
    const concertId = new Types.ObjectId().toString();

    jest.spyOn(userModel, 'findById').mockResolvedValueOnce({ _id: userId });
    jest.spyOn(concertModel, 'findById').mockResolvedValueOnce({ _id: concertId, status: 'ACTIVE' });
    jest.spyOn(reserveModel, 'countDocuments').mockResolvedValueOnce(0);
    jest.spyOn(reserveModel, 'findOne').mockResolvedValueOnce({ _id: new Types.ObjectId() });

    await expect(service.reserveSeat(userId, concertId)).rejects.toThrow(
      new BadRequestException('User already reserved a seat'),
    );
  });


  it('should get dashboard stats correctly', async () => {
    const concert1 = await concertModel.create({ name: 'C6', description: 'D6', maxSeats: 100 } as ConcertDocument);
    const concert2 = await concertModel.create({ name: 'C7', description: 'D7', maxSeats: 50 } as ConcertDocument);

    await reserveModel.create({ concertId: concert1._id, userId: new Types.ObjectId(), status: ReservationStatus.CONFIRMED } as ReserveDocument);
    await reserveModel.create({ concertId: concert2._id, userId: new Types.ObjectId(), status: ReservationStatus.CANCELLED } as ReserveDocument);

    const stats = await service.getDashboardStats();
    expect(stats.totalSeats).toBe(150);
    expect(stats.reservedCount).toBe(1);
    expect(stats.cancelledCount).toBe(1);
  });
});
