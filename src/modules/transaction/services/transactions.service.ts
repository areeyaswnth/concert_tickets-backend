import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument, TransactionAction } from '../entities/transactions.entity';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
@Injectable()
export class TransactionsService {
    constructor(
        @InjectModel(Transaction.name)
        private readonly transactionModel: Model<TransactionDocument>,
    ) { }

    async createTransaction(data: CreateTransactionDto) {
        return this.transactionModel.create(data);
    }

    async findAll() {
        return this.transactionModel.find().exec();
    }

    async findByReservation(reservationId: string) {
        return this.transactionModel.find({ reservationId }).exec();
    }
    async getAllTransactions(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const total = await this.transactionModel.countDocuments();
        const transactions = await this.transactionModel
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        return {
            data: transactions,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getUserTransactions(userId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const total = await this.transactionModel.countDocuments({ userId });
        if (total === 0) {
            throw new NotFoundException('No transactions found for this user');
        }

        const transactions = await this.transactionModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        return {
            data: transactions,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

}
