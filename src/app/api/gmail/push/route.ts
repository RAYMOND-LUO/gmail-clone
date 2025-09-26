import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getGmailService } from "~/services/gmail/service";
import { db } from "~/server/db";
import { getS3Service } from "~/services/s3/service";

/**
 * Gmail Push Notification Webhook
 * 
 * Handles real-time notifications from Google Pub/Sub when new emails arrive.
 * This enables instant email sync instead of polling.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Gmail push notification received at:', new Date().toISOString());
    
    // Parse the Pub/Sub message
    const body = await request.json() as {
      message?: {
        data?: string;
        messageId?: string;
        publishTime?: string;
      };
      subscription?: string;
    };
    console.log('Push notification body:', JSON.stringify(body, null, 2));
    
    // Validate the message structure
    if (!body.message?.data) {
      console.error('Invalid push notification format:', body);
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    
    // Decode the base64-encoded Gmail payload
    const encodedPayload = body.message.data;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8')) as {
      emailAddress?: string;
      historyId?: string;
    };
    
    console.log('Gmail push payload:', payload);
    
    const { emailAddress, historyId } = payload;
    
    if (!emailAddress || !historyId) {
      console.error('Invalid Gmail payload:', payload);
      return NextResponse.json({ error: 'Invalid Gmail payload' }, { status: 400 });
    }
    
    console.log(`Processing push notification for Gmail: ${emailAddress}, historyId: ${historyId}`);
    
    // Find user by Gmail address
    const user = await db.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: 'google',
            email: emailAddress, // Match by the stored Gmail address
          },
        },
      },
      include: {
        accounts: {
          where: { 
            provider: 'google',
            email: emailAddress,
          },
        },
      },
    });
    
    if (!user || !Array.isArray(user.accounts) || (user.accounts as unknown[]).length === 0) {
      console.log(`No user found with Google account for Gmail: ${emailAddress}`);
      return NextResponse.json({ error: 'No user found with Gmail account' }, { status: 404 });
    }
    
    const userId = user.id;
    
    // Get the Gmail service and sync new emails
    const gmailService = getGmailService(db, getS3Service());
    
    try {
      // Get the last known historyId for this user
      const syncState = await db.gmailSyncState.findFirst({
        where: {
          userId,
          provider: 'google',
        },
      });
      
      const lastHistoryId = syncState?.historyId;
      
      if (!lastHistoryId) {
        console.log(`No previous historyId found for user ${userId}, falling back to delta sync`);
        // Fallback to regular delta sync if no historyId
        const result = await gmailService.syncUserEmailsDelta(userId, 50);
        
        return NextResponse.json({
          success: true,
          userId,
          synced: result.synced,
          errors: result.errors,
          method: 'delta',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Use history-based sync (true delta sync)
      const result = await gmailService.syncUserEmailsByHistory(userId, lastHistoryId);
      
      console.log(`Push sync completed for user ${userId}:`, result);
      
      return NextResponse.json({
        success: true,
        userId,
        emailAddress,
        historyId,
        synced: result.synced,
        errors: result.errors,
        method: 'history',
        timestamp: new Date().toISOString(),
      });
      
    } catch (syncError) {
      console.error(`Push sync failed for user ${userId}:`, syncError);
      
      // Don't return error to Google - they'll retry
      // Just log the error for debugging
      return NextResponse.json({
        success: false,
        userId,
        error: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('Gmail push notification error:', error);
    
    // Return 200 to acknowledge receipt (Google will retry on 4xx/5xx)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle GET requests (for health checks)
 */
export async function GET() {
  return NextResponse.json({
    status: 'Gmail push notification endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
