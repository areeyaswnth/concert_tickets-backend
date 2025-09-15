import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConcertsService } from './services/concerts.service';
import { ConcertsController } from './controllers/concerts.controller';
import { Concert, ConcertSchema } from './entities/concert.entity';
import { Reservation, ReservationSchema } from '../reservations/entities/reservations.entity';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '@modules/users/entities/user.entity';
import { TransactionsModule } from '@modules/transaction/transactions.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Concert.name, schema: ConcertSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => TransactionsModule), // 👈 import transactions
  ],
  controllers: [ConcertsController],
  providers: [ConcertsService],
  exports: [ConcertsService], // 👈 เผื่อ module อื่นเรียกใช้
})
export class ConcertsModule {}
