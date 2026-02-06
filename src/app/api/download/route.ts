
// This file is no longer used for direct downloads by the user.
// The new flow uses a license file and a secure loader page (/run).
// The getDecryptionKey function in lib/auth.ts is now called directly from the loader.
// This file can be removed or kept for potential future administrative purposes,
// but it is no longer part of the primary user-facing download workflow.

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json(
        { success: false, message: 'This endpoint is deprecated. Please use the new /run page to load your software.' },
        { status: 410 } // 410 Gone
    );
}
