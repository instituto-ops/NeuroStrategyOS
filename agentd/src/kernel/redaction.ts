/**
 * agentd/src/kernel/redaction.ts
 *
 * Redação de segredos antes de logging/audit.
 * Regex para padrões conhecidos + heurística de entropia.
 */

const SECRET_PATTERNS: [RegExp, string][] = [
  [/AKIA[A-Z0-9]{16}/g, '[AWS_KEY]'],
  [/ghp_[a-zA-Z0-9]{36,}/g, '[GH_TOKEN]'],
  [/gho_[a-zA-Z0-9]{36,}/g, '[GH_OAUTH]'],
  [/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY]'],
  [/AIza[a-zA-Z0-9_-]{35}/g, '[GOOGLE_KEY]'],
  [/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[JWT]'],
  [/-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g, '[PRIVATE_KEY]'],
  [/Bearer\s+[a-zA-Z0-9._~+/=-]{20,}/g, '[BEARER_TOKEN]'],
  [/xox[bpoas]-[a-zA-Z0-9-]{10,}/g, '[SLACK_TOKEN]'],
  [/npm_[a-zA-Z0-9]{36}/g, '[NPM_TOKEN]'],
];

/**
 * Calcula entropia de Shannon de uma string.
 */
function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Redige segredos conhecidos de uma string.
 */
export function redactSecrets(input: string): string {
  let result = input;

  // 1. Padrões conhecidos
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  // 2. Heurística de entropia para strings longas desconhecidas
  // Procura tokens hex/base64 com alta entropia (> 4.0) e comprimento > 20
  result = result.replace(/[a-zA-Z0-9+/=_-]{24,}/g, (match) => {
    const entropy = shannonEntropy(match);
    if (entropy > 4.0 && match.length > 30) {
      return '[HIGH_ENTROPY_REDACTED]';
    }
    return match;
  });

  return result;
}

/**
 * Redige argumentos de uma chamada de tool (deep clone + redact strings).
 */
export function redactArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      result[key] = redactSecrets(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactArgs(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
