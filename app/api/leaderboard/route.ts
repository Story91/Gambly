import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '../../../lib/user-stats';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'total_won' | 'win_ratio' || 'total_won';
  const limit = parseInt(searchParams.get('limit') || '10');

  // Validate type parameter
  if (type !== 'total_won' && type !== 'win_ratio') {
    return NextResponse.json({ error: 'Invalid type. Must be total_won or win_ratio' }, { status: 400 });
  }

  // Validate limit parameter
  if (limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'Limit must be between 1 and 50' }, { status: 400 });
  }

  try {
    const leaderboard = await getLeaderboard(type, limit);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
  }
} 