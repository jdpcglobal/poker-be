import { NextResponse, type NextRequest } from 'next/server';

const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:8081',
  'http://192.168.54.75:3000',
  'https://poker-be.netlify.app',
];

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Check if the request is to the socket API endpoint
  if (req.nextUrl.pathname === '/api/socket') {
    const origin = req.headers.get('origin');
    console.log("socket got called here and we are here");
    // Allow the request if it comes from an allowed origin
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.append('Access-Control-Allow-Origin', origin);
      res.headers.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.headers.append('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.headers.append('Access-Control-Allow-Credentials', 'true'); // Allow credentials
    }
  }

  return res;
}

// Configure the middleware to apply only to the specified API paths
export const config = {
  matcher: ['/api/socket'],
};
