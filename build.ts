import fs from 'node:fs/promises'
import { logger } from '@lib/pino'

async function build() {
  logger.info('🧹 Limpando diretório /dist...')
  await fs.rm('./dist', { recursive: true, force: true })

  logger.info('🚀 Iniciando o empacotamento do backend...')
  const result = await Bun.build({
    entrypoints: ['./src/server.ts'],
    outdir: './dist',
    target: 'bun',
    sourcemap: 'linked',
    minify: true,
  })

  if (!result.success) {
    logger.error('❌ Falha no build:')
    for (const message of result.logs) {
      logger.error(message)
    }
    process.exit(1)
  }

  logger.info('✅ Build concluído com sucesso!')
}

await build()
