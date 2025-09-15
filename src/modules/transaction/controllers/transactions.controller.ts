import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TransactionsService } from '../services/transactions.service';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { RolesGuard } from '../../users/roles.guard';

interface AuthRequest extends Request {
  user?: {
    userId: string;
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
    const isAdmin = admin === 'true';


 const userId = req.user?.userId;
  const userRole = req.user?.role;
  const isAdminQuery = admin === 'true';

  if (userRole === 'admin' && isAdminQuery) {
    return this.TransactionsService.getAllTransactions(page, limit);
  } else {
    if (!userId) throw new BadRequestException('User not found');
    return this.TransactionsService.getUserTransactions(userId, page, limit);
  }
  }

}
