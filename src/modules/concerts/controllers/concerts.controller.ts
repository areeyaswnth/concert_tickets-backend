import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ConcertsService } from '../services/concerts.service';
import { CreateConcertDto } from '../dtos/create-concert.dtos';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { Roles, RolesGuard } from '../../../modules/users/roles.guard';
import { JwtAuthGuard } from '../../../modules/users/jwt-auth.guard';
import { UserRole } from '../../../common/enum/user-role.enum';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';

export interface Request {
  user?: {
    id: string;
    role: UserRole | string;
    [key: string]: any;
  };
}
@Controller('api/v1/concerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) { }

  @Roles(UserRole.ADMIN)
  @Post('create')
  create(@Body() dto: CreateConcertDto) {
    return this.concertsService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/cancel')
  async cancelConcert(
    @Param('id') id: string,
    @Body('status') status: ConcertStatus,
  ) {
    try {
      const result = await this.concertsService.cancel(id, status);
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to cancel concert');
    }
  }

  @Get('list')
  async findAll(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const userId = req.user?.id;

    return this.concertsService.findAll(userId, page, limit);
  }


  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.concertsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateConcertDto) {
    return this.concertsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.concertsService.remove(id);
  }

}
