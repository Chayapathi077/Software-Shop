
import { NextResponse } from 'next/server';
import { bindDeviceToLicense } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { licenseId, deviceId } = await request.json();

    if (!licenseId || !deviceId) {
      return NextResponse.json({ success: false, message: 'Missing licenseId or deviceId' }, { status: 400 });
    }

    const result = await bindDeviceToLicense(licenseId, deviceId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      // Return a 409 Conflict status if the license is already bound to another device
      if (result.message.includes("already bound")) {
         return NextResponse.json(result, { status: 409 });
      }
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('API Error in /api/license/bind-device:', error);
    return NextResponse.json({ success: false, message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
