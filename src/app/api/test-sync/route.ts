import { NextResponse } from "next/server";
import { getGmailService } from "~/services/gmail/service";
import { db } from "~/server/db";
import { getS3Service } from "~/services/s3/service";

/**
 * Test Gmail Sync Endpoint
 * 
 * Manual testing endpoint for Gmail sync
 * Only works in development mode
 */

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Only available in development' },
      { status: 403 }
    );
  }

  try {
    console.log('Manual Gmail sync test started');
    const gmailService = getGmailService(db, getS3Service());
    const result = await gmailService.syncAllUsersEmails();
    
    return NextResponse.json({
      success: true,
      message: 'Gmail sync test completed',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Gmail sync test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
