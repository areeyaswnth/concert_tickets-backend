import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation, ReserveDocument } from '../entities/reservations.entity';
import { Concert, ConcertDocument } from '../../../modules/concerts/entities/concert.entity';
import { ReservationStatus } from '@common/enum/reserve-status.enum';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';
import { User, UserDocument } from '../../../modules/users/entities/user.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) private reserveModel: Model<ReserveDocument>,
    @InjectModel(Concert.name) private concertModel: Model<ConcertDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async reserveSeat(userId: string, concertId: string) {

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const concert = await this.concertModel.findById(concertId);
    if (!concert) throw new NotFoundException('Concert not found');

    if (concert.status === ConcertStatus.CANCELED) {
      throw new BadRequestException('This concert has been cancelled');
    }

    const reservedCount = await this.reserveModel.countDocuments({
      concertId,
      status: { $ne: 'CANCELLED' },
    });

    if (reservedCount >= concert.maxSeats) {
      throw new BadRequestException('No seats available');
    }

    const existing = await this.reserveModel.findOne({ userId, concertId });
    if (existing) throw new BadRequestException('User already reserved a seat');

    const reserve = new this.reserveModel({ userId, concertId });
    await reserve.save();
    await concert.save();

    return reserve;
  }

  async cancelReserve(userId: string, concertId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const concert = await this.concertModel.findById(concertId);
    if (!concert) throw new NotFoundException('Concert not found');

    const reserve = await this.reserveModel.findOne({ userId, concertId });
    if (!reserve) throw new NotFoundException('Reservation not found');
    reserve.status = ReservationStatus.CANCELLED
    await reserve.save();
    return { message: 'Reservation cancelled', reservation: reserve };
  }


  async getUserReservations(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.reserveModel.find({ userId }).populate('concertId');
  }

  async getListReservation(page = 1, limit = 10) {
    page = Number(page);
    limit = Number(limit);

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const listReservation = await this.reserveModel.find()
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name')
      .populate('concertId', 'name')
      .exec();
    const total = await this.reserveModel.countDocuments();

    return {
      data: listReservation,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async getDashboardStats() {
    const concerts = await this.concertModel.find().exec();
    const totalSeats = concerts.reduce((sum, c) => sum + (c.maxSeats ?? 0), 0);
    const reservedCount = await this.reserveModel.countDocuments({
      status: ReservationStatus.CONFIRMED,
    });
    const cancelledCount = await this.reserveModel.countDocuments({
      status: ReservationStatus.CANCELLED,
    });

    return {
      totalSeats,
      reservedCount,
      cancelledCount,
    };
  }
}
