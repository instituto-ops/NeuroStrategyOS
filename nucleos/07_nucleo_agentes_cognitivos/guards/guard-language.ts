const PROHIBITED_TERMS = [
  'diagnóstico',
  'prescreva',
  'indicação clínica',
  'tratamento obrigatório',
  'intervenção direta'
];

export function guardLanguage(text?: string) {
  if (!text) return { allowed: true };
  const lowered = text.toLowerCase();
  const hit = PROHIBITED_TERMS.find(term => lowered.includes(term));
  if (hit) {
    return { allowed: false, reason: `Linguagem proibida detectada: ${hit}` };
  }
  return { allowed: true };
}
