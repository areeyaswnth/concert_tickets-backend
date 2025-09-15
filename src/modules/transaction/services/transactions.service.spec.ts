import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getModelToken } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from '../entities/transactions.entity';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionModel: Model<TransactionDocument>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: mongoose.model<TransactionDocument>(
            Transaction.name,
            new mongoose.Schema(
              {
                reservationId: String,
                userId: String,
                username: String,
                concertName: String,
                action: String,
              },
              { timestamps: true },
            ),
          ),
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionModel = module.get<Model<TransactionDocument>>(getModelToken(Transaction.name));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await transactionModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a transaction', async () => {
    const dto: CreateTransactionDto = {
      reservationId: 'res1',
      userId: 'user1',
      username: 'Alice',
      concertName: 'Concert A',
      action: 'CREATED',
    };

    const transaction = await service.createTransaction(dto);
    expect(transaction).toMatchObject(dto);
  });

  it('should find all transactions', async () => {
    await service.createTransaction({
      reservationId: 'res1',
      userId: 'user1',
      username: 'Alice',
      concertName: 'Concert A',
      action: 'CREATED',
    });
    await service.createTransaction({
      reservationId: 'res2',
      userId: 'user2',
      username: 'Bob',
      concertName: 'Concert B',
      action: 'DELETED',
    });

    const transactions = await service.findAll();
    expect(transactions).toHaveLength(2);
  });

  it('should find transactions by reservationId', async () => {
    await service.createTransaction({
      reservationId: 'res123',
      userId: 'user1',
      username: 'Alice',
      concertName: 'Concert A',
      action: 'CREATED',
    });

    const transactions = await service.findByReservation('res123');
    expect(transactions).toHaveLength(1);
    expect(transactions[0].reservationId).toBe('res123');
  });

  it('should paginate all transactions', async () => {
    for (let i = 0; i < 25; i++) {
      await service.createTransaction({
        reservationId: `res${i}`,
        userId: `user${i % 5}`,
        username: `User${i}`,
        concertName: `Concert ${i}`,
        action: 'CREATED',
      });
    }

    const page1 = await service.getAllTransactions(1, 10);
    expect(page1.data).toHaveLength(10);
    expect(page1.meta.total).toBe(25);
    expect(page1.meta.pages).toBe(3);

    const page3 = await service.getAllTransactions(3, 10);
    expect(page3.data).toHaveLength(5);
  });

  it('should paginate transactions by userId', async () => {
    for (let i = 0; i < 15; i++) {
      await service.createTransaction({
        reservationId: `res${i}`,
        userId: 'user42',
        username: `User${i}`,
        concertName: `Concert ${i}`,
        action: 'CREATED',
      });
    }
    for (let i = 0; i < 5; i++) {
      await service.createTransaction({
        reservationId: `resX${i}`,
        userId: 'otherUser',
        username: `Other${i}`,
        concertName: `Concert X${i}`,
        action: 'CREATED',
      });
    }

    const user42Page1 = await service.getUserTransactions('user42', 1, 10);
    expect(user42Page1.data).toHaveLength(10);
    expect(user42Page1.meta.total).toBe(15);
    expect(user42Page1.meta.pages).toBe(2);

    const user42Page2 = await service.getUserTransactions('user42', 2, 10);
    expect(user42Page2.data).toHaveLength(5);
  });
});
