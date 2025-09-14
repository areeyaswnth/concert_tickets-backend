import { Body, Controller, Delete, Get, Param, Post, Put, Req, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { LoginDto } from '../dtos/login.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { Roles, RolesGuard } from '../roles.guard';
import { UserRole } from '../../../common/enum/user-role.enum';

@Controller('api/v1/user')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
    ) { }

    @Post('/auth/register')

    async register(@Body() createUserDto: CreateUserDto) {
        const result = await this.usersService.register(createUserDto);
        return result;
    }


    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('list')
    findAll() {
        return this.usersService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Post('/auth/login')
    async login(@Body() loginDto: LoginDto) {
        const { email, password } = loginDto;
        return this.usersService.login(email, password);
    }
    @UseGuards(JwtAuthGuard)
    @Get('/auth/me')
    getMe(@Req() req: any) {
    const { userId, email, role } = req.user;
    return { id: userId, email, role };
  }
}
