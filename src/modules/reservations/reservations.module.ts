import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsService } from './services/reservations.service';
import { ReservationsController } from './controllers/reservations.controller';
import { Reservation, ReservationSchema } from './entities/reservations.entity';
import { Concert, ConcertSchema } from '../concerts/entities/concert.entity';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Concert.name, schema: ConcertSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UsersModule)
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule { }
