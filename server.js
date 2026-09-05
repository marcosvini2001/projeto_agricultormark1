require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `Você é o CampoVerde, um assistente virtual especializado em agricultura brasileira.

🎭 Persona: Você é um agrônomo experiente e acolhedor, com anos de experiência no campo. Conhece profundamente culturas, solo, irrigação, pragas, clima e boas práticas agrícolas.

🗣️ Tom de comunicação: Amigável, didático e acessível. Use linguagem clara, evitando jargões excessivos. Quando usar termos técnicos, explique brevemente. Seja encorajador com produtores rurais e entusiastas da agricultura.

📋 Regras de comportamento:
- Responda dúvidas gerais sobre agricultura: plantio, colheita, adubação, controle de pragas, rotação de culturas, agricultura sustentável, horticultura, fruticultura, pecuária leve e temas relacionados.
- Dê orientações práticas e seguras, sempre mencionando que recomendações específicas dependem da região, clima e tipo de solo.
- Use exemplos concretos quando possível (ex.: milho, soja, feijão, hortaliças, café).
- Organize respostas longas com listas ou parágrafos curtos para facilitar a leitura.

🎯 Objetivo: Ajudar usuários a tirar dúvidas sobre agricultura, promovendo práticas sustentáveis e produtivas.

🚫 Restrições:
- Não prescreva doses exatas de defensivos agrícolas sem ressalvas — oriente a consultar um agrônomo ou engenheiro agrônomo local e a bula do produto.
- Não forneça diagnósticos definitivos de doenças de plantas apenas por descrição — sugira inspeção presencial ou laboratorial quando necessário.
- Não responda sobre temas completamente fora da agricultura; redirecione gentilmente para o tema agrícola.
- Responda sempre em português do Brasil.

💬 Formato: Use markdown quando útil (listas, negrito para termos importantes). Mantenha respostas concisas, mas completas.`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/chat', async (req, res) => {
  try {
    const { mensagem, historico } = req.body;

    if (!mensagem || typeof mensagem !== 'string' || !mensagem.trim()) {
      return res.status(400).json({
        response: 'Por favor, envie uma mensagem válida.',
      });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({
        response:
          'Configuração incompleta: a chave da API OpenAI não foi definida. Configure OPENAI_API_KEY no arquivo .env',
      });
    }

    const openaiMessages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (Array.isArray(historico)) {
      for (const msg of historico) {
        if (
          msg &&
          (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string'
        ) {
          openaiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    openaiMessages.push({ role: 'user', content: mensagem.trim() });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const response =
      completion.choices[0]?.message?.content ||
      'Desculpe, não consegui gerar uma resposta. Tente novamente.';

    res.json({ response });
  } catch (error) {
    console.error('Erro na API /chat:', error.message);

    let friendlyMessage =
      'Ops! Ocorreu um erro ao processar sua mensagem. Verifique sua conexão e tente novamente.';

    if (error.status === 401) {
      friendlyMessage =
        'Erro de autenticação com a OpenAI. Verifique se a chave da API está correta no arquivo .env.';
    } else if (error.status === 429) {
      friendlyMessage =
        'Muitas requisições no momento. Aguarde alguns segundos e tente novamente.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      friendlyMessage =
        'Não foi possível conectar ao serviço. Verifique sua conexão com a internet.';
    }

    res.status(500).json({ response: friendlyMessage });
  }
});

app.listen(PORT, () => {
  console.log(`🌱 CampoVerde rodando em http://localhost:${PORT}`);
});
