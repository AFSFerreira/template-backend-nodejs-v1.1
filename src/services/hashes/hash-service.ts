import type { IComparePassword } from '@custom-types/services/hashes/compare-password'
import type { HashedPassword } from '@custom-types/services/hashes/hashed-password'
import type { HashedToken } from '@custom-types/services/hashes/hashed-token'
import type { JobHash } from '@custom-types/services/hashes/job-hash'
import type { Token } from '@custom-types/services/hashes/token'
import type { UuidHash } from '@custom-types/services/hashes/uuid-hash'
import crypto from 'node:crypto'
import { env } from '@env/index'
import { singleton } from 'tsyringe'
import { v4 as uuidv4 } from 'uuid'

/**
 * Serviço centralizado de hashing e geração de identificadores.
 *
 * Combina Argon2id (via Bun.password) para senhas, SHA-256 para tokens,
 * HMAC-SHA256 para blind indexes de documentos, e UUID v4 para identificadores únicos.
 */
@singleton()
export class HashService {
  private static readonly argonConfig = {
    algorithm: 'argon2id' as const,
    memoryCost: env.ARGON_MEMORY_COST,
    timeCost: env.ARGON_TIME_COST,
  }

  private static cachedDummyHash: string | null = null

  /**
   * Gera hash SHA-256 de um token ou string qualquer.
   *
   * @param input - Valor a ser hasheado.
   * @returns Hash SHA-256 em formato hexadecimal.
   */
  hashToken(input: string): HashedToken {
    return crypto.hash('sha256', input) as HashedToken
  }

  /**
   * Gera hash Argon2id de uma senha via Bun.password.
   *
   * @param password - Senha em texto plano.
   * @returns Hash Argon2id da senha.
   */
  async hashPassword(password: string): Promise<HashedPassword> {
    const hash = await Bun.password.hash(password, HashService.argonConfig)
    return hash as HashedPassword
  }

  /**
   * Compara uma senha em texto plano com um hash Argon2id.
   *
   * @returns `true` se a senha corresponde ao hash.
   */
  async comparePassword({ password, hashedPassword }: IComparePassword): Promise<boolean> {
    return await Bun.password.verify(password, hashedPassword)
  }

  /**
   * Gera um token criptograficamente seguro usando `crypto.randomBytes`.
   *
   * @param bytesNumber - Quantidade de bytes aleatórios (a string resultante terá o dobro em caracteres hex).
   * @returns Token hexadecimal.
   */
  generateToken(bytesNumber: number): Token {
    return crypto.randomBytes(bytesNumber).toString('hex') as Token
  }

  generateJobId(): JobHash {
    return uuidv4() as JobHash
  }

  generateUuid(): UuidHash {
    return uuidv4() as UuidHash
  }

  /**
   * Verifica se um hash Argon2id existente precisa ser recalculado
   * por estar com parâmetros de custo desatualizados.
   *
   * Parseia o formato PHC string ($argon2id$v=19$m=...,t=...,p=...) e compara
   * com os valores atuais de configuração.
   */
  needsUpgrade(hash: string): boolean {
    const params = this.parseArgon2Hash(hash)

    if (!params) {
      return true
    }

    return (
      params.memoryCost !== HashService.argonConfig.memoryCost || params.timeCost !== HashService.argonConfig.timeCost
    )
  }

  /**
   * Retorna um hash Argon2id dummy (cache interno) para prevenir timing attacks.
   *
   * Usado quando o usuário não é encontrado durante autenticação, garantindo
   * que o tempo de resposta seja consistente independentemente da existência do usuário.
   */
  async getDummyHash(): Promise<string> {
    if (!HashService.cachedDummyHash) {
      HashService.cachedDummyHash = await Bun.password.hash(
        'dummy_password_for_timing_attacks',
        HashService.argonConfig,
      )
    }

    return HashService.cachedDummyHash
  }

  private parseArgon2Hash(hash: string): { memoryCost: number; timeCost: number } | null {
    const paramsSegment = hash.split('$')[3]

    if (!paramsSegment) {
      return null
    }

    const pairs = Object.fromEntries(paramsSegment.split(',').map((pair) => pair.split('=')))

    const memoryCost = Number(pairs['m'])
    const timeCost = Number(pairs['t'])

    if (Number.isNaN(memoryCost) || Number.isNaN(timeCost)) {
      return null
    }

    return { memoryCost, timeCost }
  }
}
