import { TransactionAction } from '@common/enum/transaction-action.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;


@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Reservation' })
  reservationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  username: string;

  @Prop({ type: String, required: true })
  concertName: string;

  @Prop({ type: String, enum: TransactionAction, required: true })
  action: TransactionAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) // <-- เพิ่ม userId
  userId: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;
}


export const TransactionSchema = SchemaFactory.createForClass(Transaction);
