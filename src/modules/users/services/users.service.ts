import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { IUserService } from '../interfaces/user.interface';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../jwt.strategy';

@Injectable()
export class UsersService implements IUserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly jwtService: JwtService,
    ) { }

    async register(createUserDto: CreateUserDto) {
        const { email, password, name, role } = createUserDto;

        const existing = await this.userModel.findOne({ email }).exec();
        if (existing) throw new ConflictException('Email already exists');

        const hashed = await bcrypt.hash(password, 10);

        const created = new this.userModel({ name, email, password: hashed, role });
        const user = await created.save();

        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = this.jwtService.sign(payload);

        const { password: _, ...result } = user.toObject();
        return {
            user: result,
            role:user.role,
            access_token: token,
            expires_in: jwtConstants.expiresIn || '1h',
        };
    }

    async validateUser(email: string, password: string) {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) return null;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;

        const { password: _, ...rest } = user.toObject();
        return rest;
    }

    async login(email: string, password: string) {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new UnauthorizedException('Invalid credentials');

        const payload = {
            sub: user._id,
            email: user.email,
            role: user.role
        };
        return {
            role:user.role,
            access_token: this.jwtService.sign(payload),
            expires_in: jwtConstants.expiresIn || '1h',
        };
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userModel.findById(id).exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const updated = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
        if (!updated) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return updated;
    }

    async remove(id: string) {
        const deleted = await this.userModel.findByIdAndDelete(id).exec();
        if (!deleted) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return deleted;
    }
}
