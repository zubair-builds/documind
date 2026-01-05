import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SavedPassword from '@/models/SavedPassword';
import { decryptPassword } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

/**
 * GET /api/passwords/[id]/decrypt
 * Decrypt and return a saved password
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const { getAuthenticatedUser } = await import('@/lib/api-auth');
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const passwordId = params.id;

    // Connect to database
    await connectDB();

    // Find saved password
    const savedPassword = await SavedPassword.findById(passwordId);

    if (!savedPassword) {
      return NextResponse.json(
        { error: 'Password not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (savedPassword.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Decrypt password
    const decrypted = decryptPassword(savedPassword.encryptedPassword);

    // Update lastUsed timestamp
    await SavedPassword.findByIdAndUpdate(passwordId, {
      lastUsed: new Date(),
    });

    return NextResponse.json({
      success: true,
      password: decrypted,
    });
  } catch (error: any) {
    console.error('Error decrypting password:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to decrypt password',
      },
      { status: 500 }
    );
  }
}

