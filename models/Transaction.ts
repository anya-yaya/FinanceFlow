import mongoose, { Schema, model, models } from 'mongoose';

export interface ITransaction {
  _id?: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  description: string;
}

const TransactionSchema = new Schema<ITransaction>({
  amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be greater than 0'] },
  category: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  date: { type: String, required: true },
  description: { type: String, required: true, trim: true, minlength: [3, 'Description must be at least 3 characters'] },
});

export default models.Transaction || model<ITransaction>('Transaction', TransactionSchema);