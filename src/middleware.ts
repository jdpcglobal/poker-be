import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export const config = {
  matcher: ['/admin/:path*', '/auth/login'],
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPrivatePath = path.startsWith('/admin'); // Path that requires authentication
  console.log("isPrivatePath",isPrivatePath);
  const token = req.cookies.get('token')?.value || '';
  console.log('Middleware path:', req.nextUrl.pathname);
  // Check if token is present
  if (token) {
    try {
      // Verify the token
      const { payload } = await jwtVerify(token, secret);
      console.log('Decoded JWT payload:', payload);

      // Check if token contains required fields (userId, role, etc.)
      if (!payload.userId || !payload.role) {
        console.log('Incomplete token payload, redirecting to login...');
        // If payload is missing key fields, redirect to login
        if (path !== '/auth/login') {
          return NextResponse.redirect(new URL('/auth/login', req.url));
        }
      } else {
        // Valid token, redirect to /chats if user is at /auth/login
        if (path === '/auth/login') {
          return NextResponse.redirect(new URL('/admin', req.url));
        }

        // If the path is a private path (requires authentication), proceed
        if (isPrivatePath) {
          return NextResponse.next();
        }
      }
    } catch (error) {
      console.log('Token verification failed:', error);
      // If token verification fails, redirect to login
      if (isPrivatePath && path !== '/auth/login') {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    }
  } else {
    // If no token is found, redirect to login for private paths
    if (isPrivatePath && path !== '/auth/login') {
      console.log('No token found, redirecting to login...');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  // Allow request to proceed if no conditions above matched
  return NextResponse.next();
}


// Matcher configuration to apply middleware to specific routes



// import { NextResponse, type NextRequest } from 'next/server';

// const allowedOrigins = [
//   'http://localhost:3002',
//   'http://localhost:8081',
//   'http://192.168.54.75:3000',
//   'https://poker-be.netlify.app',
// ];

// export function middleware(req: NextRequest) {
//   const res = NextResponse.next();

//   // Check if the request is to the socket API endpoint
//   if (req.nextUrl.pathname === '/api/socket') {
//     const origin = req.headers.get('origin');
//     console.log("socket got called here and we are here");
//     // Allow the request if it comes from an allowed origin
//     if (origin && allowedOrigins.includes(origin)) {
//       res.headers.append('Access-Control-Allow-Origin', origin);
//       res.headers.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//       res.headers.append('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//       res.headers.append('Access-Control-Allow-Credentials', 'true'); // Allow credentials
//     }
//   }

//   return res;
// }

// // Configure the middleware to apply only to the specified API paths
// export const config = {
//   matcher: ['/api/socket'],
// };


