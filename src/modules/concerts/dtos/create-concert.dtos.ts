import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateConcertDto {
  @IsNotEmpty()
  name: string;

  description?: string;

  @IsNumber()
  maxSeats: number;
}
