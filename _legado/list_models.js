require('dotenv').config({ path: '../.env' }); 
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const models = parsed.models.map(m => m.name.replace('models/', ''));
            console.log("AVAILABLE MODELS:", models.join(', '));
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error(err);
});
