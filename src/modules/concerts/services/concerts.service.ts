import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Concert, ConcertDocument } from '../entities/concert.entity';
import { CreateConcertDto } from '../dtos/create-concert.dtos';
import { UpdateConcertDto } from '../dtos/update-concert.dto';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';
import { Reservation, ReserveDocument } from '@modules/reservations/entities/reservations.entity';
import { ReservationStatus } from '@common/enum/reserve-status.enum';
import { User, UserDocument } from '@modules/users/entities/user.entity';

@Injectable()
export class ConcertsService {
  constructor(
    @InjectModel(Concert.name) private concertModel: Model<ConcertDocument>,
    @InjectModel(Reservation.name) private reserveModel: Model<ReserveDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,

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

  // filter deleted = false
  const query = { deleted: false } as any;

  const listConcert = await this.concertModel
    .find(query)
    .skip(skip)
    .limit(limit)
    .exec();

  const concertCount = await this.concertModel.countDocuments(query).exec();

  // if (!userId) {
  //   return {
  //     data: listConcert,
  //     meta: {
  //       total: concertCount,
  //       page,
  //       limit,
  //       totalPages: Math.ceil(concertCount / limit),
  //     },
  //   };
  // }

  const reservations = await this.reserveModel
    .find({ userId: new Types.ObjectId(userId) })
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

  // soft delete
  concert.status = status;
  concert.deleted = true;
  await concert.save();

  const result = await this.reserveModel.updateMany(
    { concertId: new Types.ObjectId(id), status: ReservationStatus.CONFIRMED },
    { $set: { status: ReservationStatus.CANCELLED } }
  );

  return {
    message: `Concert ${id} soft deleted and reservations cancelled`,
    concert,
    reservationsUpdatedCount: result.modifiedCount,
  };
}


  async remove(id: string) {
    const deleted = await this.concertModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Concert not found');
    return { message: 'Deleted successfully' };
  }
}
