
import { NextResponse } from 'next/server';
import { deleteSoftware } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { softwareId } = await request.json();

    if (!softwareId) {
      return NextResponse.json({ success: false, message: 'Missing softwareId' }, { status: 400 });
    }
    
    // In a real-world app, you'd add an authentication layer here
    // to ensure only the software's owner can delete it.
    const result = await deleteSoftware(softwareId);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('API Error in /api/software/delete:', error);
    return NextResponse.json({ success: false, message: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

    