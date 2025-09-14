import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from '../services/reservations.service';
import { JwtAuthGuard } from '../../../modules/users/jwt-auth.guard';
import { Roles, RolesGuard } from '../../../modules/users/roles.guard';
import { UserRole } from '../../../common/enum/user-role.enum';
interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/reserve')
export class ReservationsController {

  constructor(private readonly reservationsService: ReservationsService) { }

  @Post(':userId/:concertId')
  async reserveSeat(@Param('userId') userId: string, @Param('concertId') concertId: string) {
    return this.reservationsService.reserveSeat(userId, concertId);
  }
  //  @Roles(UserRole.ADMIN)
  @Delete(':userId/:concertId')
  async cancelReserve(@Param('userId') userId: string, @Param('concertId') concertId: string) {
    return this.reservationsService.cancelReserve(userId, concertId);
  }
  @Roles(UserRole.ADMIN)
  @Get('dashboard')
  async getDashboardStats() {
    return this.reservationsService.getDashboardStats();
  }
  @Get('')
  async listReservation(
    @Req() req: AuthRequest, // <-- ใช้ interface ใหม่
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('admin') admin?: string,
  ) {
    const userId = req.user?.id;
    const isAdmin = admin === 'true';

    if (isAdmin) {
      return this.reservationsService.getListReservation(page, limit);
    } else {
      if (!userId) {
        throw new BadRequestException('User not found');
      }
      return this.reservationsService.getUserReservations(userId);
    }
  }

  @Get(':userId')
  async getUserReservations(@Param('userId') userId: string) {
    return this.reservationsService.getUserReservations(userId);
  }




}
