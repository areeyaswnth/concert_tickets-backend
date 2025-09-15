import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Concert, ConcertDocument } from '../entities/concert.entity';
import { CreateConcertDto } from '../dtos/create-concert.dtos';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';
import { Reservation, ReserveDocument } from '@modules/reservations/entities/reservations.entity';
import { ReservationStatus } from '@common/enum/reserve-status.enum';
import { TransactionsService } from '@modules/transaction/services/transactions.service';
import { TransactionAction } from '@common/enum/transaction-action.enum';
interface PopulatedUser {
  _id: Types.ObjectId;
  name: string; 
}
@Injectable()
export class ConcertsService {
  constructor(
    @InjectModel(Concert.name) private concertModel: Model<ConcertDocument>,
    @InjectModel(Reservation.name) private reserveModel: Model<ReserveDocument>,
    private readonly transactionsService: TransactionsService,
  ) { }

  async create(dto: CreateConcertDto) {
    const concert = new this.concertModel(dto);
    return concert.save();
  }
  async findAll(userId?: string, page = 1, limit = 10) {
    page = Number(page);
    limit = Number(limit);

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const query = { deleted: false } as any;

    const listConcert = await this.concertModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec();

    const concertCount = await this.concertModel.countDocuments(query).exec();

    const reservationQuery: any = { deleted: false };
    if (userId) {
      reservationQuery.userId = new Types.ObjectId(userId); 
    }

    const reservations = await this.reserveModel
      .find(reservationQuery)
      .select('concertId _id status')
      .exec();

    const reservationMap = new Map(
      reservations.map((r) => [r.concertId.toString(), r])
    );

    const concertsWithReservation = listConcert.map((concert) => {
      const concertId = String(concert._id);
      const res = reservationMap.get(concertId);
      return {
        ...concert.toObject(),
        reservationId: res?._id ?? null,
        reservationStatus: res?.status ?? null,
      };
    });

    return {
      data: concertsWithReservation,
      meta: {
        total: concertCount,
        page,
        limit,
        totalPages: Math.ceil(concertCount / limit),
      },
    };
  }



  async findOne(id: string) {
    const concert = await this.concertModel.findById(id).exec();
    if (!concert) throw new NotFoundException('Concert not found');
    return concert;
  }

  async update(id: string, dto: UpdateConcertDto) {
    const updated = await this.concertModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Concert not found');
    return updated;
  }
  async cancel(id: string, status: ConcertStatus = ConcertStatus.CANCELED) {
    const concert = await this.concertModel.findById(id).exec();

    if (!concert) {
      throw new NotFoundException(`Concert with id ${id} not found`);
    }

    if (concert.deleted || concert.status === ConcertStatus.CANCELED) {
      throw new BadRequestException(`Concert with id ${id} is already cancelled`);
    }

    const reservations = await this.reserveModel
      .find({ concertId: new Types.ObjectId(id) })
      .populate('userId', 'name')
      .exec();

    for (const res of reservations) {
      const user = res.userId as unknown as PopulatedUser;

      await this.transactionsService.createTransaction({
        reservationId: String(res._id),
        userId: user._id.toString(),
        username: user.name,
        concertName: concert.name,
        action: TransactionAction.DELETED_BY_ADMIN,
      });
    }

    await this.reserveModel.updateMany(
      {
        concertId: id,
        status: ReservationStatus.CONFIRMED,
      },
      {
        $set: {
          status: ReservationStatus.CANCELLED,
          deleted: true,
        },
      },
    );

    concert.status = status;
    concert.deleted = true;
    await concert.save();

    return {
      message: `Concert ${id} soft deleted and reservations cancelled`,
      concert,
      reservationsUpdatedCount: reservations.length,
    };
  }

  async remove(id: string) {
    const deleted = await this.concertModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Concert not found');
    return { message: 'Deleted successfully' };
  }
}
