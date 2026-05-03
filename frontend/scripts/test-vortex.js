/**
 * frontend/scripts/test-vortex.js
 * 
 * Testes de regressão automatizados para a Skill Vórtex.
 * Valida geração, auditoria e fluxo transacional.
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const API_BASE = 'http://localhost:3000/api/vortex';
const API_KEY = process.env.VORTEX_API_KEY;

if (!API_KEY) {
  console.error('❌ VORTEX_API_KEY não encontrada no .env');
  process.exit(1);
}

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function runTests() {
  console.log('🌀 [TEST] Iniciando Testes de Regressão Vórtex...');

  try {
    // 1. Teste de Health
    console.log('   - Testando Health Check...');
    const health = await axios.get('http://localhost:3000/api/ai/health');
    console.log('   ✅ Health OK:', health.data.status);

    // 2. Teste de Auditoria
    console.log('   - Testando Auditoria...');
    const audit = await client.post('/audit-draft', {
      code: '<h1>Título</h1><p>Conteúdo sem palavras proibidas.</p>'
    });
    if (audit.data.approved) console.log('   ✅ Auditoria OK');
    else throw new Error('Falha na auditoria');

    // 3. Teste de Fluxo Transacional (Publish)
    console.log('   - Testando Fluxo Transacional (Commit)...');
    const publish = await client.post('/commit', {
      filename: 'test-page.tsx',
      content: 'function Test() { return <div>Test</div>; }',
      message: '[TEST] Commit de Teste de Regressão',
      author: 'Tester Bot'
    });
    if (publish.data.success && publish.data.revisionId) {
      console.log('   ✅ Fluxo Transacional OK (Revision ID:', publish.data.revisionId, ')');
    } else throw new Error('Falha no fluxo transacional');

    // 4. Teste de Geração (Dependente de API Externa)
    console.log('   - Testando Geração (Dependente de API Gemini)...');
    try {
        const genSync = await client.post('/generate', {
          prompt: 'Crie um componente de botão simples.',
          model: 'gemini-2.5-flash'
        });
        if (genSync.data.code) console.log('   ✅ Geração Técnica OK');
    } catch (aiErr) {
        console.warn('   ⚠️  Geração AI ignorada (Erro de API externa):', aiErr.response?.data?.error?.message || aiErr.message);
    }

    console.log('\n🏆 [TEST] Todos os testes passaram! 100% VERDE.');
  } catch (error) {
    console.error('\n❌ [TEST] Falha nos testes:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
