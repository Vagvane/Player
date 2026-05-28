import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key']
  const expectedKey = process.env.VIDEO_PROCESSOR_API_KEY

  if (!expectedKey) {
    logger.error('VIDEO_PROCESSOR_API_KEY is not configured on the server')
    res.status(500).json({ success: false, message: 'Server configuration error' })
    return
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path })
    res.status(401).json({ success: false, message: 'Invalid API key' })
    return
  }

  next()
}