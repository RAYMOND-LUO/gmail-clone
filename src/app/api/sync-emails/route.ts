import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getGmailService } from "~/services/gmail/service";
import { db } from "~/server/db";
import { getS3Service } from "~/services/s3/service";

/**
 * Gmail Email Sync API Endpoint
 * 
 * This endpoint is designed to be called by cron-job.org
 * It syncs all emails for all users with Gmail connected
 */

export async function GET(request: NextRequest) {
  try {
    console.log('Gmail sync API called at:', new Date().toISOString());
    
    // Optional: Add basic authentication for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SHARED_SECRET!;
    
    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start the sync process using dependency injection
    const gmailService = getGmailService(db, getS3Service());
    const result = await gmailService.syncAllUsersEmails();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    console.error('Gmail sync API error:', error);
    
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

export async function POST(request: NextRequest) {
  // Also support POST for cron jobs that prefer POST
  return GET(request);
}
