import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsService } from './services/reservations.service';
import { ReservationsController } from './controllers/reservations.controller';
import { Reservation, ReservationSchema } from './entities/reservations.entity';
import { Concert, ConcertSchema } from '../concerts/entities/concert.entity';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/entities/user.entity';
import { Transaction, TransactionSchema } from '../transaction/entities/transactions.entity';
import { TransactionsService } from '../transaction/services/transactions.service';
import { TransactionsController } from '@modules/transaction/controllers/transactions.controlle';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Concert.name, schema: ConcertSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [ReservationsController, TransactionsController],
  providers: [ReservationsService, TransactionsService],
  exports: [ReservationsService, TransactionsService],
})
export class ReservationsModule {}
