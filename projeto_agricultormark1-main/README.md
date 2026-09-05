# 🌾 CampoVerde — Assistente Agrícola Inteligente

Assistente Virtual Inteligente desenvolvido com **HTML, CSS, JavaScript** (front-end) e **Node.js + Express** (back-end), integrado à **API da OpenAI**.

O CampoVerde responde dúvidas gerais sobre agricultura com uma persona de agrônomo experiente e acolhedor.

## 🛠 Tecnologias

| Front-end | Back-end |
|-----------|----------|
| HTML5 | Node.js |
| CSS3 | Express |
| JavaScript | OpenAI API |
| Fetch API | |

## ✅ Funcionalidades

- Interface de chat com tema agrícola
- Envio de mensagens via Fetch API
- Histórico de conversa (`let messages = []`)
- Botão **Nova Conversa** (limpa histórico)
- Indicador de carregamento com spinner ("Pensando...")
- Tratamento de erros com mensagens amigáveis
- Diferenciação visual entre mensagens do usuário e da IA
- System Prompt configurado no back-end

### Extras (bônus)

- Modo claro e escuro
- Enviar com Enter
- Copiar respostas da IA
- Contador de mensagens
- Horário das mensagens
- Scroll automático
- Renderização básica de Markdown
- Persistência com LocalStorage

## 🚀 Como executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar a chave da OpenAI

Copie o arquivo de exemplo e adicione sua chave:

```bash
copy .env.example .env
```

Edite o `.env`:

```
OPENAI_API_KEY=sua_chave_api_aqui
PORT=3000
```

### 3. Iniciar o servidor

```bash
npm start
```

Acesse: **http://localhost:3000**

## 🚀 Publicar no GitHub

Este projeto inclui uma automação local para criar o repositório e enviar o código.

### Arquivos adicionados

- `scripts/github-publish.sh`: cria o repo se necessário, configura o remoto e faz push.
- `.github-publish.example.env`: modelo de configuração local.

### Como usar

1. Copie o exemplo de configuração:

```bash
copy .github-publish.example.env .github-publish.env
```

2. Edite `.github-publish.env` e preencha:

- `GITHUB_TOKEN`
- opcionalmente `GITHUB_OWNER`
- opcionalmente `GITHUB_REPO`
- opcionalmente `GITHUB_VISIBILITY`

3. Execute o script na raiz do projeto:

```bash
bash scripts/github-publish.sh --public --create
```

### Exemplos

Criar e subir em um repo novo com o nome da pasta:

```bash
bash scripts/github-publish.sh --public --create
```

Subir em um repositório específico já existente:

```bash
bash scripts/github-publish.sh --repo seu-usuario/seu-repo --no-create
```

### Observações

- O script usa `GITHUB_TOKEN`.
- O arquivo `.github-publish.env` não deve ser versionado.
- `node_modules/` e `.env` continuam ignorados pelo Git.

## 🌐 API

### `POST /chat`

Envia uma mensagem e recebe a resposta da IA.

**Entrada:**

```json
{
  "mensagem": "Qual a melhor época para plantar feijão?"
}
```

**Saída:**

```json
{
  "response": "A época ideal para plantar feijão depende da região..."
}
```

**Parâmetro opcional:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `historico` | `array` | Mensagens anteriores da conversa (`role` + `content`) para manter contexto |

**Exemplo com cURL:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d "{\"mensagem\": \"Oi\"}"
```

## 📁 Estrutura do projeto

```
projeto_final/
├── public/
│   ├── index.html    # Interface do chat
│   ├── style.css     # Estilos (tema agrícola)
│   └── script.js     # Lógica do front-end
├── server.js         # API Express + OpenAI
├── package.json
├── .env.example
└── README.md
```

## 🧠 System Prompt

O System Prompt define a persona **CampoVerde** — um agrônomo virtual especializado em agricultura brasileira. Ele orienta tom de comunicação, regras de comportamento, restrições (como não prescrever defensivos sem ressalvas) e formato das respostas.

O prompt é injetado automaticamente pelo back-end antes de cada requisição à OpenAI.

## ⚠️ Observações

- Este projeto **não utiliza banco de dados**.
- O histórico é mantido no front-end (`messages`) e enviado ao back-end a cada requisição.
- A persistência via LocalStorage é opcional e funciona apenas no navegador do usuário.

## Link Hospedado no Render:
https://projeto-agricultormark1.onrender.com/
