import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from '../services/transactions.service';
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
@Controller('api/v1/transactions')
export class TransactionsController {

  constructor(private readonly TransactionsService: TransactionsService) { }


 @Get('list')
  async listTransactions(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('admin') admin?: string,
  ) {
    const userId = req.user?.id;
    const isAdmin = admin === 'true';

    if (isAdmin) {
      return this.TransactionsService.getAllTransactions(page, limit);
    } else {
      if (!userId) {
        throw new BadRequestException('User not found');
      }
      return this.TransactionsService.getUserTransactions(userId, page, limit);
    }
  }


}
