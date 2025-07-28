import { NextResponse } from 'next/server';
import { getAllUserStats } from '../../../lib/user-stats';

export async function GET() {
  try {
    const allStats = await getAllUserStats();
    return NextResponse.json(allStats);
  } catch (error) {
    console.error("Error in all-user-stats route:", error);
    return NextResponse.json(
      { error: "Failed to fetch all user stats" },
      { status: 500 }
    );
  }
} 