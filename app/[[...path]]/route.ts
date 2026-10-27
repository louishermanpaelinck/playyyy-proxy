import type { NextRequest } from 'next/server'

const UPSTREAM_ORIGIN = 'https://louis141414.github.io'
const UPSTREAM_BASE_PATH = '/playyyy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'range',
  'if-none-match',
  'if-modified-since',
  'user-agent',
]

// Hop-by-hop / encoding headers that must not be copied: fetch() already decoded the body.
const STRIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'strict-transport-security',
  'set-cookie',
])

function buildUpstreamUrl(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  return `${UPSTREAM_ORIGIN}${UPSTREAM_BASE_PATH}${pathname}${search}`
}

function rewriteLocation(location: string, request: NextRequest) {
  const resolved = new URL(location, UPSTREAM_ORIGIN)
  if (resolved.origin !== UPSTREAM_ORIGIN) return location

  let path = resolved.pathname
  if (path === UPSTREAM_BASE_PATH || path.startsWith(`${UPSTREAM_BASE_PATH}/`)) {
    path = path.slice(UPSTREAM_BASE_PATH.length) || '/'
  }
  return new URL(`${path}${resolved.search}${resolved.hash}`, request.nextUrl.origin).toString()
}

async function proxy(request: NextRequest) {
  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  let upstream: Response
  try {
    upstream = await fetch(buildUpstreamUrl(request), {
      method: request.method,
      headers,
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch {
    return new Response('Upstream site is unreachable.', { status: 502 })
  }

  const responseHeaders = new Headers()
  upstream.headers.forEach((value, name) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value)
    }
  })

  const location = upstream.headers.get('location')
  if (location) responseHeaders.set('location', rewriteLocation(location, request))

  const hasBody = request.method !== 'HEAD' && ![204, 304].includes(upstream.status)

  return new Response(hasBody ? upstream.body : null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export { proxy as GET, proxy as HEAD }
