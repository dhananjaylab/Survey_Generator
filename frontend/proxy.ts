import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Basic ')) {
    try {
      const base64 = authHeader.slice(6)
      const decoded = atob(base64)
      const colonIdx = decoded.indexOf(':')
      const username = decoded.slice(0, colonIdx)
      const password = decoded.slice(colonIdx + 1)
      const validUser = process.env.AUTH_USERNAME || 'admin'
      const validPass = process.env.AUTH_PASSWORD || 'surveygen2024'
      if (username === validUser && password === validPass) {
        return NextResponse.next()
      }
    } catch {
      // Invalid base64 — fall through to 401
    }
  }

  return new NextResponse('Authentication Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Knit AI Survey Generator", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)'],
}
