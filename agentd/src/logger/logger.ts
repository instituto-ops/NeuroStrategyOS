/**
 * agentd/src/logger/logger.ts
 * 
 * Logger centralizado via pino.
 * Redaction list vazia por enquanto (preenchida na Fase 5).
 */

import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  name: config.daemon.name,
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
  // Redaction será expandida na Fase 5 (Permission Kernel)
  redact: {
    paths: ['*.password', '*.secret', '*.token', '*.apiKey'],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
