import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConcertsModule } from './modules/concerts/concerts.module';
import { UsersModule } from './modules/users/users.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { MongooseModule } from '@nestjs/mongoose';
@Module({
  imports: [ MongooseModule.forRoot('mongodb://mongo:27017/concertdb'),
    ConcertsModule, UsersModule, ReservationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
