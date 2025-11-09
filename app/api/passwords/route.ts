import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SavedPassword from '@/models/SavedPassword';
import { encryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

/**
 * POST /api/passwords
 * Save a new encrypted password
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const { label, password } = await request.json();

    // Validate inputs
    if (!label || !password) {
      return NextResponse.json(
        { error: 'Label and password are required' },
        { status: 400 }
      );
    }

    if (label.trim() === '' || password.trim() === '') {
      return NextResponse.json(
        { error: 'Label and password cannot be empty' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check password limit (max 50 per user)
    const count = await SavedPassword.countDocuments({ userId });
    if (count >= 50) {
      return NextResponse.json(
        { error: 'Maximum password limit reached (50)' },
        { status: 400 }
      );
    }

    // Encrypt password
    const encryptedPassword = encryptPassword(password);

    // Save to database
    const savedPassword = await SavedPassword.create({
      userId,
      label: label.trim(),
      encryptedPassword,
      lastUsed: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password saved successfully',
      password: {
        id: String(savedPassword._id),
        label: savedPassword.label,
        lastUsed: savedPassword.lastUsed,
        createdAt: savedPassword.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error saving password:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to save password',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/passwords
 * Get all user's saved passwords (without decrypted values)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Connect to database
    await connectDB();

    // Get all user's passwords, sorted by last used
    const passwords = await SavedPassword.find({ userId })
      .sort({ lastUsed: -1 })
      .select('_id label lastUsed createdAt')
      .lean();

    return NextResponse.json({
      success: true,
      passwords: passwords.map((p) => ({
        id: p._id.toString(),
        label: p.label,
        lastUsed: p.lastUsed,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching passwords:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch passwords',
      },
      { status: 500 }
    );
  }
}

