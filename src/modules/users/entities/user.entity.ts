import { IsEmail, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/enum/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;
    @Prop({ required: true })
    password: string;
    @IsOptional()
    @IsEnum(UserRole, { message: 'Role must be either admin or user' })
    @Prop({
        type: String,
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    _id: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
