/**
 * Thumbnails module barrel export
 *
 * Re-exports all public functions from the thumbnail generation modules:
 * - sprite.generator: FFmpeg-based sprite sheet generation
 * - vtt.generator:    WebVTT file generation for seek-bar previews
 */

export * from './sprite.generator'
export * from './vtt.generator'
