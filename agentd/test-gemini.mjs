/**
 * test-gemini.mjs — smoke test rápido da API Gemini
 *
 * Uso (no diretório agentd):
 *   node --env-file=../.env test-gemini.mjs
 *
 * Ou com a key inline:
 *   GEMINI_API_KEY=sua_key node test-gemini.mjs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
const modelId = process.env.MODEL_NAVIGATION || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY não encontrada no ambiente.');
  process.exit(1);
}

// Gemini 2.0+ e 2.5+ exigem v1beta
const needsBeta = /^gemini-2\.|^gemini-exp/.test(modelId);
const requestOptions = needsBeta ? { apiVersion: 'v1beta' } : undefined;

console.log(`\n🔑 API Key: ${apiKey.slice(0, 12)}...`);
console.log(`🤖 Modelo: ${modelId}`);
console.log(`🔄 API Version: ${needsBeta ? 'v1beta' : 'v1 (padrão)'}\n`);

const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel(
  { model: modelId },
  requestOptions,
);

try {
  console.log('📡 Enviando prompt de teste...');
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Responda exatamente: OK_GEMINI_FUNCIONANDO' }] }],
  });
  const text = result.response.text();
  console.log(`\n✅ SUCESSO — Resposta: "${text}"`);
  console.log('\n🟢 Brain pode usar este modelo. Reinicie o daemon para aplicar as correções.\n');
} catch (err) {
  console.error(`\n❌ FALHA — ${err.message}`);

  if (err.message?.includes('403')) {
    console.log('\n🔍 Diagnóstico 403:');
    console.log('  1. A key pode não ter acesso ao modelo:', modelId);
    console.log('  2. Tente gemini-1.5-flash: MODEL_NAVIGATION=gemini-1.5-flash node test-gemini.mjs');
    console.log('  3. Verifique em: https://aistudio.google.com/app/apikey');
  } else if (err.message?.includes('404')) {
    console.log('\n🔍 Diagnóstico 404: modelo não encontrado.');
    console.log('  Modelos disponíveis: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, gemini-2.5-flash');
  }
  process.exit(1);
}
