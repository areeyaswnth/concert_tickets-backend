import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateConcertDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxSeats?: number;
}
