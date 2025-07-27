import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserStats, 
  updateUserStats, 
  createUserAccount,
  incrementGlobalStats 
} from '../../../lib/user-stats';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const stats = await getUserStats(address);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    return NextResponse.json({ error: 'Failed to get user stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, isWin, tokensWon, action } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (action === 'create') {
      // Create user account
      await createUserAccount(address);
      return NextResponse.json({ success: true });
    }

    if (action === 'update') {
      // Update user stats after a gamble
      if (typeof isWin !== 'boolean') {
        return NextResponse.json({ error: 'isWin must be a boolean' }, { status: 400 });
      }

      await updateUserStats(address, isWin, tokensWon || "0");
      await incrementGlobalStats(isWin);
      
      const updatedStats = await getUserStats(address);
      return NextResponse.json(updatedStats);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Error updating user stats:', error);
    return NextResponse.json({ error: 'Failed to update user stats' }, { status: 500 });
  }
} 