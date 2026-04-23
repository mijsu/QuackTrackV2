import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      uid: string;
      name: string;
      email: string;
      role: string;
      departmentId: string | null;
      image?: string | null;
    };
  }
  interface User {
    id: string;
    uid: string;
    name: string;
    email: string;
    role: string;
    departmentId: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    uid: string;
    name: string;
    email: string;
    role: string;
    departmentId: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[AUTH] Authorize called with email:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing email or password');
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        console.log('[AUTH] User found:', user ? { email: user.email, role: user.role } : null);

        if (!user) {
          console.log('[AUTH] User not found');
          return null;
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        console.log('[AUTH] Password match:', passwordMatch);

        if (!passwordMatch) {
          console.log('[AUTH] Password does not match');
          return null;
        }

        // Create audit log for login
        try {
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: 'login',
              entity: 'user',
              entityId: user.id,
            },
          });
        } catch (error) {
          console.error('[AUTH] Failed to create audit log:', error);
        }

        return {
          id: user.id,
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('[AUTH] JWT callback, user:', user ? 'present' : 'null', 'trigger:', trigger);
      
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.uid = user.uid;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }
      
      // Handle session update - refresh user data from database
      if (trigger === 'update' && token.id) {
        const freshUser = await db.user.findUnique({
          where: { id: token.id as string },
        });
        
        if (freshUser) {
          token.name = freshUser.name;
          token.departmentId = freshUser.departmentId;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      console.log('[AUTH] Session callback, token:', token ? 'present' : 'null');
      
      if (token) {
        session.user = {
          id: token.id as string,
          uid: token.uid as string,
          name: token.name ?? '',
          email: token.email ?? '',
          role: token.role as string,
          departmentId: token.departmentId as string | null,
          image: null,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'quacktrack-ptc-secret-key-2024',
  debug: false,
};
