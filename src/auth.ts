import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // This is a placeholder for actual credential validation
        // In a real app, you'd check a hashed password
        if (credentials?.email && credentials?.password) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (user) {
            return user;
          }
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as any)?.role;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');

      if (isOnAdmin) {
        if (isLoggedIn && userRole === 'ADMIN') return true;
        return false; // Redirect to login or show 403
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
