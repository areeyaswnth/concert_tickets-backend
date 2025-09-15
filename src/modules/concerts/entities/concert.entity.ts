import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConcertStatus } from '../../../common/enum/concert-status.enum';

export type ConcertDocument = Concert & Document;

@Schema({ timestamps: true })
export class Concert {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: 1 })
  maxSeats: number;

  @Prop({ 
    type: String, 
    enum: ConcertStatus, 
    default: ConcertStatus.AVAILABLE
  })
  status: ConcertStatus;

  @Prop({ default: false })
  deleted: boolean; 
}

export const ConcertSchema = SchemaFactory.createForClass(Concert);
