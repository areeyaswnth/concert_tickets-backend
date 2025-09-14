import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { AppModule } from '../../../app.module'; 
import { User, UserSchema } from '../entities/user.entity';
import { UserRole } from '../../../common/enum/user-role.enum';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let jwtTokenAdmin: string; 

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        JwtModule.register({ secret: 'testsecret', signOptions: { expiresIn: '1h' } }),
        AppModule, 
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongod.stop();
    await app.close();
  });

  it('/api/v1/user/auth/register (POST) => should register user', async () => {
    const dto = {
      name: 'E2E Test',
      email: 'e2e@test.com',
      password: 'password123',
      role: UserRole.USER,
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/user/auth/register')
      .send(dto)
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(dto.email);
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body).toHaveProperty('access_token');
    const createdUserId = response.body.user._id;
    const userInDb = await mongoose.model('User').findById(createdUserId).exec();
    expect(userInDb).not.toBeNull();
    expect(userInDb.email).toBe(dto.email);
  });

  it('/api/v1/user/auth/login (POST) => should login', async () => {
    const dto = {
      email: 'e2e@test.com',
      password: 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/user/auth/login')
      .send(dto)
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
  });

  describe('/api/v1/user/:id (PUT & GET & DELETE)', () => {
    let userId: string;
    let token: string;

    beforeAll(async () => {
      const dto = {
        name: 'UserForCrud',
        email: 'crud@test.com',
        password: 'password123',
        role: UserRole.USER,
      };
      const res = await request(app.getHttpServer())
        .post('/api/v1/user/auth/register')
        .send(dto)
        .expect(201);
      userId = res.body.user._id;
      token = res.body.access_token;
    });

    it('GET /api/v1/user/:id => should return user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe('crud@test.com');
    });

    it('PUT /api/v1/user/:id => should update user', async () => {
      const updatedName = 'Updated Name';
      const res = await request(app.getHttpServer())
        .put(`/api/v1/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: updatedName })
        .expect(200);

      expect(res.body.name).toBe(updatedName);
    });

    it('DELETE /api/v1/user/:id => should delete user', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
    
  });
});
