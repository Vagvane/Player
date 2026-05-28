/**
 * @file index.ts
 * @description Barrel export for queue modules.
 * Re-exports all public symbols from queue.config and worker
 * so consumers can import from a single entry point:
 *
 * @example
 * import { videoQueue, addVideoProcessingJob, getJobStatus, videoWorker, shutdownWorker } from '../queue'
 */

export * from './queue.config'
export * from './worker'
