import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsService } from './concerts.service';
import { getModelToken } from '@nestjs/mongoose';
import { Concert, ConcertSchema } from '../entities/concert.entity';
import { Reservation, ReservationSchema } from '../../../modules/reservations/entities/reservations.entity';
import { User, UserSchema } from '@modules/users/entities/user.entity';
import { Transaction, TransactionSchema } from '@modules/transaction/entities/transactions.entity';
import mongoose, { Model, Types } from 'mongoose';
import { TransactionsService } from '@modules/transaction/services/transactions.service';

describe('ConcertsService', () => {
  let service: ConcertsService;
  let concertModel: Model<Concert>;
  let reserveModel: Model<Reservation>;
  let userModel: Model<User>;
  let transactionModel: Model<Transaction>;
  let transactionService: TransactionsService;

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/concertdb_test');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcertsService,
        {
          provide: getModelToken(Concert.name),
          useValue: mongoose.model<Concert>(Concert.name, ConcertSchema),
        },
        {
          provide: getModelToken(Reservation.name),
          useValue: mongoose.model<Reservation>(Reservation.name, ReservationSchema),
        },
        {
          provide: getModelToken(User.name),
          useValue: mongoose.model<User>(User.name, UserSchema),
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: mongoose.model<Transaction>(Transaction.name, TransactionSchema),
        },
        {
          provide: TransactionsService, // ✅ mock TransactionsService
          useValue: {
            createTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConcertsService>(ConcertsService);
    concertModel = module.get<Model<Concert>>(getModelToken(Concert.name));
    reserveModel = module.get<Model<Reservation>>(getModelToken(Reservation.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
    transactionModel = module.get<Model<Transaction>>(getModelToken(Transaction.name));
    transactionService = module.get<TransactionsService>(TransactionsService);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await concertModel.deleteMany({});
    await reserveModel.deleteMany({});
    await userModel.deleteMany({});
    await transactionModel.deleteMany({});
  });

  it('should create a concert', async () => {
    const concert = await service.create({
      name: 'Concert Test',
      description: 'Test description',
      maxSeats: 100,
    });
    expect(concert._id).toBeDefined();
    expect(concert.name).toBe('Concert Test');
  });

});
