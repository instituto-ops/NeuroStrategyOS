const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

async function testMemory() {
    try {
        console.log("--- TESTANDO LIMPAR MEMÓRIA ---");
        const clearRes = await axios.post(`${API_URL}/api/neuro-training/memory/clear`);
        console.log("Clear Response:", clearRes.data);

        console.log("\n--- ADICIONANDO REGRA DUMMY ---");
        // Manualmente injetando uma regra no JSON para testar o DELETE (já que não temos rota de POST simples sem Gemini)
        const FILE_PATH = 'c:/Users/artes/Documents/NeuroStrategy OS - VM/Modulo WordPress Publicação/frontend/estilo_victor.json';
        const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        const dummyId = "test_rule_123";
        data.style_rules.push({ id: dummyId, categoria: "TESTE", titulo: "Regra de Teste", regra: "Remova-me" });
        fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
        console.log("Regra dummy adicionada ao arquivo.");

        console.log("\n--- TESTANDO DELETAR REGRA ESPECÍFICA ---");
        const deleteRes = await axios.delete(`${API_URL}/api/neuro-training/memory/${dummyId}`);
        console.log("Delete Response:", deleteRes.data);

        const finalData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        const exists = finalData.style_rules.some(r => r.id === dummyId);
        console.log("Regra dummy ainda existe?", exists);

    } catch (e) {
        console.error("ERRO NO TESTE:", e.message);
    }
}

testMemory();
