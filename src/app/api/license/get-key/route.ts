
import { NextResponse } from 'next/server';
import { getDecryptionKey } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { licenseId, deviceId, walletAddress } = await request.json();

    if (!licenseId || !deviceId || !walletAddress) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    const result = await getDecryptionKey(licenseId, deviceId, walletAddress);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      // Use a 403 Forbidden status for clear authorization failures (e.g., blocked, wrong owner).
      if (result.message.includes("blocked") || result.message.includes("revoked") || result.message.includes("owner") || result.message.includes("Wallet address")) {
        return NextResponse.json(result, { status: 403 });
      }
      // For other internal failures (e.g., couldn't find software key), return a 500 error.
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('API Error in /api/license/get-key:', error);
    return NextResponse.json({ success: false, message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
