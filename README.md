# playyyy Proxy

A small reverse proxy that serves https://louis141414.github.io/playyyy/ from your own domain. It's built with a Next.js 16 Route Handler and runs on any host.

## How It Works

Every request to this app is forwarded to the upstream GitHub Pages site, and the response is streamed back to the browser.

    Browser  -->  playyyy.vercel.app/game/  -->  louis141414.github.io/playyyy/game/
             <--  streamed response           <--

- **Catch-all route:** `app/[[...path]]/route.ts` matches every path, including `/`.
- **Path mapping:** The incoming path and query string are added to the end of the upstream base URL.
- **Streaming:** The response body is passed through without buffering, so large files and range requests work.
- **Redirects:** Redirects that point at the upstream site are rewritten to stay on the proxy domain.

## Project Structure

    app/
      [[...path]]/
        route.ts        # Proxy handler (GET + HEAD)
    next.config.mjs     # Keeps trailing slashes + basic security headers

## Configuration

The upstream URL is a constant at the top of `app/[[...path]]/route.ts`:

    const UPSTREAM = "https://louis141414.github.io/playyyy";

Change it to proxy a different static site.

## Request Handling

**Headers sent upstream:**
`accept`, `accept-language`, `range`, `user-agent`, `if-none-match`, `if-modified-since`.
Cookies and authorization headers are never sent.

**Headers removed from upstream responses:**
`content-encoding`, `content-length`, `transfer-encoding`, `connection`, `set-cookie`, `strict-transport-security`.
Some of these would break the response because the body has already been decoded. The rest shouldn't come from a third-party site.

**Methods:** Only `GET` and `HEAD`. Other methods return `405`.

## next.config.mjs

- `skipTrailingSlashRedirect: true` stops Next.js from removing trailing slashes, which the site's relative asset paths depend on.
- It adds the `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` headers.

## Running Locally

    pnpm install
    pnpm dev

Then open http://localhost:3000.

## Deployment

Deploy to Vercel. No environment variables are needed.

## Limitations

- **Single-site only:** This is not a general "browse any URL" proxy.
- **No HTML rewriting:** Absolute links to `louis141414.github.io` and files loaded from other domains are fetched directly by the browser, not through the proxy.
- **Read-only:** There's no support for POST, forms, or WebSockets.
- **Serverless limits:** Vercel function duration and bandwidth limits apply to every proxied request.