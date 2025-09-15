import { TransactionAction } from '@common/enum/transaction-action.enum';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsMongoId()
  @IsNotEmpty()
  reservationId: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  concertName: string;

  @IsEnum(TransactionAction)
  @IsNotEmpty()
  action: TransactionAction;

  @IsMongoId()
  @IsNotEmpty()
  userId: string; // <-- เพิ่มตรงนี้
}
