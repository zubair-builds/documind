import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyToken } from '@/lib/jwt';

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
}

/**
 * Helper to get the authenticated user from either session (cookies) or Bearer token (mobile)
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
    try {
        // 1. Try NextAuth session (cookies)
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            return {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.name || '',
            };
        }

        // 2. Try Bearer Token (mobile app)
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);

            if (decoded) {
                return {
                    id: decoded.userId,
                    email: decoded.email,
                    name: decoded.name,
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error in getAuthenticatedUser:', error);
        return null;
    }
}
