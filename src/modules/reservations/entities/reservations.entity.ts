import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReservationStatus } from '../../../common/enum/reserve-status.enum';

export type ReserveDocument = Reservation & Document;

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Concert' })
  concertId: Types.ObjectId;

  @Prop({ default: Date.now })
  reservedAt: Date;

  @Prop({
    type: String,
    enum: ReservationStatus,
    default: ReservationStatus.CONFIRMED,
  })
  status: ReservationStatus;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
