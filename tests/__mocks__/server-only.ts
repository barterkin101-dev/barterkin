// Mock for 'server-only' package in Vitest (jsdom) environment.
// The real package throws at import time to prevent client-side use.
// In tests, this guard is a no-op — Next.js build-time enforcement is separate.
export {}
