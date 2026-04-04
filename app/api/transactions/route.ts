import { dbConnect } from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';
import { request } from 'https';
import { NextResponse } from 'next/server';

export async function GET() {
  await dbConnect();
  const transactions = await Transaction.find({}).sort({ date: -1 });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const newTx = await Transaction.create(body);
  return NextResponse.json(newTx);
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    
    await Transaction.findByIdAndDelete(id);
    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updatedTx = await Transaction.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json(updatedTx);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}