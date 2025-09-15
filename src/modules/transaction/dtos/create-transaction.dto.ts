import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { TransactionAction } from '../entities/transactions.entity';

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
}
