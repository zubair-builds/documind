import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import SavedPassword from '@/models/SavedPassword';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/passwords/[id]
 * Delete a saved password
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user session
    // Get authenticated user session
    let session = await getServerSession(authOptions);
    let user;

    if (session?.user?.id) {
      user = session.user;
    } else {
      // Fallback: Check for Bearer token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          user = { id: decoded.userId, email: decoded.email, name: decoded.name };
        }
      }
    }

    if (!user || !user.id) {
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

    // Delete password
    await SavedPassword.findByIdAndDelete(passwordId);

    return NextResponse.json({
      success: true,
      message: 'Password deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting password:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to delete password',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/passwords/[id]
 * Update password label
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user session
    // Get authenticated user session
    let session = await getServerSession(authOptions);
    let user;

    if (session?.user?.id) {
      user = session.user;
    } else {
      // Fallback: Check for Bearer token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          user = { id: decoded.userId, email: decoded.email, name: decoded.name };
        }
      }
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const passwordId = params.id;

    // Parse request body
    const { label } = await request.json();

    if (!label || label.trim() === '') {
      return NextResponse.json(
        { error: 'Label is required' },
        { status: 400 }
      );
    }

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

    // Update label
    savedPassword.label = label.trim();
    await savedPassword.save();

    return NextResponse.json({
      success: true,
      message: 'Label updated successfully',
      password: {
        id: String(savedPassword._id),
        label: savedPassword.label,
        lastUsed: savedPassword.lastUsed,
      },
    });
  } catch (error: any) {
    console.error('Error updating password label:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to update label',
      },
      { status: 500 }
    );
  }
}

