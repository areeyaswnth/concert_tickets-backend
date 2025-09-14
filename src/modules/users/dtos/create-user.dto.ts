import { IsEmail, IsNotEmpty, IsOptional,IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enum/user-role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}