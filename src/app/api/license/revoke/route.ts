
import { NextResponse } from 'next/server';
import { revokeLicense } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { licenseId } = await request.json();

    if (!licenseId) {
      return NextResponse.json({ success: false, message: 'Missing licenseId' }, { status: 400 });
    }

    // A real app should have an authentication layer to ensure only the seller can call this.
    const result = await revokeLicense(licenseId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('API Error in /api/license/revoke:', error);
    return NextResponse.json({ success: false, message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

    