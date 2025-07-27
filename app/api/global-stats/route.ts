import { NextResponse } from 'next/server';
import { getGlobalStats } from '../../../lib/user-stats';

export async function GET() {
  try {
    const globalStats = await getGlobalStats();
    return NextResponse.json(globalStats);
  } catch (error) {
    console.error('Error getting global stats:', error);
    return NextResponse.json({ error: 'Failed to get global stats' }, { status: 500 });
  }
} 