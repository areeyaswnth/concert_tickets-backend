import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDocument, UserSchema } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../common/enum/user-role.enum';
import { JwtModule } from '@nestjs/jwt';

describe('UsersService (integration with real DB)', () => {
  let service: UsersService;
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect('mongodb://localhost:27017/concertdb');


    const module: TestingModule = await Test.createTestingModule({
  imports: [
    JwtModule.register({
      secret: 'test-secret', 
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    UsersService,
    {
      provide: getModelToken(User.name),
      useValue: mongoose.model<User>('User', UserSchema),
    },
  ],
}).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  it('should create and find a user', async () => {
    const user = await service.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
      role: UserRole.USER,
    });

    expect(user).toHaveProperty('_id');
    expect(user.name).toBe('Test User');

    const found = await service.findOne(user._id.toString());
    expect(found.email).toBe('test@example.com');
  });

  it('should register a user and return access token', async () => {
    const result = await service.register({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password',
      role: UserRole.ADMIN,
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('access_token');
    expect(result.role).toBe('admin');
  });

  it('should login an existing user', async () => {
    const hashed = await bcrypt.hash('password', 10);
    const created = await userModel.create({
      name: 'Login User',
      email: 'login@example.com',
      password: hashed,
      role: 'user',
    });

    const result = await service.login('login@example.com', 'password');
    expect(result).toHaveProperty('access_token');
    expect(result.role).toBe('user');
  });

  it('should throw NotFoundException when user not found', async () => {
    await expect(service.findOne(new mongoose.Types.ObjectId().toString()))
      .rejects.toThrow('User not found');
  });
});
