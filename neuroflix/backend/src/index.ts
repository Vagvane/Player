/**
 * @file index.ts
 * @description Main entry point for the Neuroflix backend.
 *
 * This file exists solely to provide a single, conventional entry point
 * (`src/index.ts`) that delegates to the server bootstrap module.
 *
 * Why a separate index?
 * - Keeps `server.ts` focused on startup logic.
 * - Allows `package.json` `"main"` / `"exports"` to point here without
 *   coupling to internal file names.
 * - Makes it straightforward to swap the server implementation without
 *   changing external references.
 *
 * Note: `server.ts` has a side-effect (calls `startServer()` at module
 * level), so a bare import is all that is needed — there are no named
 * symbols to re-export from it.
 *
 * App factory exports ARE re-exported so integration tests can call
 * `createApp()` directly without importing `server.ts` and triggering
 * the startup side-effect.
 */

import 'dotenv/config'

// Re-export the app factory for use in tests and tooling
export { createApp } from './app'

// Bootstrap the HTTP server (side-effect import)
import './server'
