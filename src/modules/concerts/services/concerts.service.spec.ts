import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsService } from './concerts.service';
import { getModelToken } from '@nestjs/mongoose';
import { Concert, ConcertDocument, ConcertSchema } from '../entities/concert.entity';
import { Reservation, ReserveDocument, ReservationSchema } from '../../../modules/reservations/entities/reservations.entity';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Types } from 'mongoose';
import { CreateConcertDto } from '../dtos/create-concert.dtos';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';
import { ReservationStatus } from '../../../common/enum/reserve-status.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { User, UserDocument, UserSchema } from '@modules/users/entities/user.entity';

describe('ConcertsService', () => {
  let service: ConcertsService;
  let mongod: MongoMemoryServer;
  let concertModel: Model<ConcertDocument>;
  let reserveModel: Model<ReserveDocument>;
  let userModel: Model<UserDocument>;
  interface ConcertWithReservation {
    _id: string;
    name: string;
    description: string;
    maxSeats: number;
    status: ConcertStatus;
    reservationId: string | null;
    reservationStatus: ReservationStatus | null;
  }


  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/concertdb');


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcertsService,
        {
          provide: getModelToken(Concert.name),
          useValue: mongoose.model(Concert.name, ConcertSchema) as unknown as Model<ConcertDocument>,
        },
        {
          provide: getModelToken(Reservation.name),
          useValue: mongoose.model(Reservation.name, ReservationSchema) as unknown as Model<ReserveDocument>,
        },
        {
          provide: getModelToken(User.name),
          useValue: mongoose.model(User.name, UserSchema),
        },
      ],
    }).compile();

    service = module.get<ConcertsService>(ConcertsService);
    concertModel = module.get<Model<ConcertDocument>>(getModelToken(Concert.name));
    reserveModel = module.get<Model<ReserveDocument>>(getModelToken(Reservation.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));

  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await concertModel.deleteMany({});
    await reserveModel.deleteMany({});
    await userModel.deleteMany({})
  });

  it('should create a concert', async () => {
    const dto: CreateConcertDto = { name: 'Concert 1', description: 'Desc', maxSeats: 100 };
    const concert = await service.create(dto);
    expect((concert._id as Types.ObjectId).toString()).toBeDefined();
    expect(concert.name).toBe('Concert 1');
  });

  it('should find a concert by id', async () => {
    const created = await concertModel.create({
      name: 'Concert 2',
      description: 'Desc',
      maxSeats: 50,
    } as ConcertDocument);
    const found = await service.findOne((created._id as Types.ObjectId).toString());
    expect(found.name).toBe('Concert 2');
  });

  it('should update a concert', async () => {
    const created = await concertModel.create({
      name: 'Concert 3',
      description: 'Desc',
      maxSeats: 30,
    } as ConcertDocument);
    const dto: UpdateConcertDto = { name: 'Updated', description: 'New Desc', maxSeats: 40 };
    const updated = await service.update((created._id as Types.ObjectId).toString(), dto);
    expect(updated.name).toBe('Updated');
    expect(updated.maxSeats).toBe(40);
  });

  it('should cancel concert and its reservations', async () => {
    const concert = await concertModel.create({
      name: 'Test Concert',
      description: 'Test Description',
      maxSeats: 50,
      status: ConcertStatus.AVAILABLE
    } as ConcertDocument);

    const user = await userModel.create({
      name: 'Test User',
      email: 'test@example.com',
      password: '123456',
    } as UserDocument);

    await reserveModel.create({
      concertId: concert._id,
      userId: user._id,
      status: ReservationStatus.CONFIRMED,
    } as ReserveDocument);

    const result = await service.cancel(String(concert._id));

    expect(result.concert.status).toBe(ConcertStatus.CANCELED);
    expect(result.reservationsUpdatedCount).toBe(1);

    const updatedReserve = await reserveModel.findOne({ concertId: concert._id });
    expect(updatedReserve?.status).toBe(ReservationStatus.CANCELLED);
  });

  it('should throw NotFoundException if concert does not exist', async () => {
    const fakeId = new Types.ObjectId().toString();
    await expect(service.cancel(fakeId)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if concert already cancelled', async () => {
    const concert = await concertModel.create({
      name: 'Cancelled Concert',
      description: 'Already cancelled',
      maxSeats: 50,
      status: ConcertStatus.CANCELED,
    } as ConcertDocument);

    await expect(service.cancel(String(concert._id)))
      .rejects.toThrow(BadRequestException);
  });
  it('should return paginated concerts without userId (admin)', async () => {
    for (let i = 1; i <= 15; i++) {
      await concertModel.create({ name: `Concert ${i}`, description: 'desc', maxSeats: 100 } as ConcertDocument);
    }

    const result = await service.findAll(undefined, 2, 5);

    expect(result.data).toHaveLength(5);
    expect(result.meta.total).toBe(15);
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.totalPages).toBe(3);
  });

  it('should return concerts with user reservations', async () => {
    const userId = new Types.ObjectId().toString();

    const concert1 = await concertModel.create({ name: 'C1', description: 'D1', maxSeats: 50 } as ConcertDocument);
    const concert2 = await concertModel.create({ name: 'C2', description: 'D2', maxSeats: 50 } as ConcertDocument);

    await reserveModel.create({
      concertId: concert1._id,
      userId: new Types.ObjectId(userId),
      status: ReservationStatus.CONFIRMED,
      reservedAt: new Date(),
    } as unknown as ReserveDocument);

    const result = await service.findAll(userId, 1, 10);

    const data = result.data as ConcertWithReservation[];

    expect(data).toHaveLength(2);

    const concertWithRes = data.find(c => String(c._id) === String(concert1._id));
    expect(concertWithRes?.reservationId).toBeDefined();
    expect(concertWithRes?.reservationStatus).toBe(ReservationStatus.CONFIRMED);

    const concertWithoutRes = data.find(c => (String(c._id) === String(concert2._id)));
    expect(concertWithoutRes?.reservationId).toBeNull();
    expect(concertWithoutRes?.reservationStatus).toBeNull();

  });


  it('should default to page 1 and limit 10 if invalid values', async () => {
    for (let i = 0; i < 12; i++) {
      await concertModel.create({ name: `Concert ${i}`, description: 'desc', maxSeats: 50 } as ConcertDocument);
    }

    const result = await service.findAll(undefined, -1, -5);

    expect(result.data).toHaveLength(10);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });



});
