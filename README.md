# 🤖 Mano IA

Converse com personagens de IA únicos — seu mensageiro pessoal com inteligência artificial.

## Stack

| Camada         | Tecnologia                             |
| -------------- | -------------------------------------- |
| Front-end      | Vite + React + TypeScript              |
| Estilo         | CSS Modules e Tailwind CSS             |
| Autenticação   | Firebase Authentication                |
| Banco de dados | Cloud Firestore                        |
| Arquivos       | Firebase Storage                       |
| IA             | Google Gemini API (`gemini-2.5-flash`) |

---

## Pré-requisitos

- Node.js ≥ 18
- Conta no [Firebase](https://console.firebase.google.com)
- Chave de API do [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas chaves:

```bash
cp .env.example .env
```

Edite `.env`:

```env
VITE_GEMINI_API_KEY=sua_chave_gemini

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Configurar Firebase

No Firebase Console:

1. **Authentication** → Ativar provedores: _E-mail/senha_ e _Google_
2. **Firestore** → Criar banco em modo de produção → Publicar regras de `firestore.rules`
3. **Storage** → Ativar → Publicar regras de `storage.rules`

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

### 5. Build para produção

```bash
npm run build
npm run preview
```

---

## Estrutura do projeto

```
mano-ia/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/           # Login, Cadastro
│   │   ├── chat/           # ChatArea, MarkdownRenderer
│   │   ├── common/         # ProtectedRoute
│   │   └── layout/         # AppShell, MainLayout, Sidebar
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── PersonasContext.tsx
│   ├── lib/
│   │   ├── firebase.ts     # Inicialização Firebase
│   │   ├── firestore.ts    # CRUD Firestore
│   │   └── gemini.ts       # Chamadas à API Gemini
│   ├── types.ts            # Interfaces + templates de personas
│   ├── App.tsx             # Roteamento
│   ├── main.tsx            # Entry point
│   └── index.css           # CSS global + variáveis
├── .env.example
├── .gitignore
├── firestore.rules
├── storage.rules
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Limite de personas

No plano gratuito: **5 personas** por usuário. O limite será removido em um futuro plano Premium.

---

## Limites de arquivo

A API Gemini aceita arquivos de até **20 MB**. Arquivos maiores precisam estar no Google Drive. O app exibe um aviso e bloqueia o envio quando o limite é excedido.

---

## Licença

Projeto privado — © 2025 Mano IA. Todos os direitos reservados.
