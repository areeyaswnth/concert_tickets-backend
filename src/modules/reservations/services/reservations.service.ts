import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation, ReserveDocument } from '../entities/reservations.entity';
import { Concert, ConcertDocument } from '../../../modules/concerts/entities/concert.entity';
import { ReservationStatus } from '@common/enum/reserve-status.enum';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';
import { User, UserDocument } from '../../../modules/users/entities/user.entity';
import { Transaction, TransactionDocument } from '../../transaction/entities/transactions.entity';
import { TransactionsService } from '@modules/transaction/services/transactions.service';
import { TransactionAction } from '@common/enum/transaction-action.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name) private reserveModel: Model<ReserveDocument>,
    @InjectModel(Concert.name) private concertModel: Model<ConcertDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private transactionsModel: Model<TransactionDocument>,
    private readonly transactionService: TransactionsService,
  ) {}

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
      status: { $ne: ReservationStatus.CANCELLED },
    });

    if (reservedCount >= concert.maxSeats) {
      throw new BadRequestException('No seats available');
    }

    const existing = await this.reserveModel.findOne({ userId, concertId });
    if (existing && existing.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot reserve again. User has previously cancelled this seat.',
      );
    }
    if (existing && existing.status !== ReservationStatus.CANCELLED) {
      throw new BadRequestException('User already has a reservation.');
    }

    const reserve = new this.reserveModel({ userId, concertId });
    await reserve.save();

    await this.transactionService.createTransaction({
      reservationId: String(reserve._id),
      username: user.name,
      concertName: concert.name,
      action: TransactionAction.CONFIRMED,
      userId:userId
    });

    return reserve;
  }

  async cancelReserve(userId: string, concertId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const concert = await this.concertModel.findById(concertId);
    if (!concert) throw new NotFoundException('Concert not found');

    const reservation = await this.reserveModel.findOne({ userId, concertId });
    if (!reservation) throw new NotFoundException('Reservation not found');

    reservation.status = ReservationStatus.CANCELLED;
    //reservation.deleted = true;
    await reservation.save();

    await this.transactionService.createTransaction({
      reservationId: String(reservation._id),
      username: user.name,
      concertName: concert.name,
      action: TransactionAction.CANCELLED,
      userId:userId
    });

    return reservation;
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

    const listReservation = await this.reserveModel
      .find()
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
    const concerts = await this.concertModel.find({
      status: { $ne: ConcertStatus.CANCELED }
    }
    ).exec();
    const totalSeats = concerts.reduce(
      (sum, c) => sum + (c.maxSeats ?? 0),
      0,
    );
    const reservedCount = await this.reserveModel.countDocuments({
      status: ReservationStatus.CONFIRMED,
    });
    const cancelledCount = await this.reserveModel.countDocuments({
      status: ReservationStatus.CANCELLED,
      deleted: false
    });

    return {
      totalSeats,
      reservedCount,
      cancelledCount,
    };
  }
}
