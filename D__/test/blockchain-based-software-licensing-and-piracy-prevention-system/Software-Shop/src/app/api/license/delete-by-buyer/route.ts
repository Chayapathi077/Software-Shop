
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    const { licenseId, walletAddress } = await request.json();

    if (!licenseId || !walletAddress) {
      return NextResponse.json({ success: false, message: 'Missing licenseId or walletAddress' }, { status: 400 });
    }
    
    if (!ObjectId.isValid(licenseId)) {
        return NextResponse.json({ success: false, message: 'Invalid license ID format.' }, { status: 400 });
    }

    if (!ethers.isAddress(walletAddress)) {
        return NextResponse.json({ success: false, message: 'Invalid wallet address format.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    const license = await db.collection('licenses').findOne({ 
        _id: new ObjectId(licenseId),
        buyerAddress: walletAddress.toLowerCase() 
    });
    
    if (!license) {
        return NextResponse.json({ success: false, message: 'License not found or you do not have permission to modify it.' }, { status: 404 });
    }

    const result = await db.collection('licenses').updateOne(
      { _id: new ObjectId(licenseId) },
      { $set: { status: 'deleted_by_user' } }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ success: true, message: 'License has been removed.' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to update the license status.' }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error in /api/license/delete-by-buyer:', error);
    return NextResponse.json({ success: false, message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
