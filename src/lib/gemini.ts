import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase"; // Ajuste o caminho se necessário
import type { Message } from "../types";
import { logPersonaRejected, logPersonaGenerated } from "./analytics";

// ── Firebase Functions Clients ────────────────────────────────────────────────
const fnUploadFileGemini = httpsCallable<{ base64Data: string, mimeType: string, size: number }, { fileUri: string, mimeType: string }>(functions, "uploadFileGemini");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fnSendGeminiMessage = httpsCallable<{ systemPrompt: string, historyContents: any[], userParts: any[] }, { text: string }>(functions, "sendGeminiMessage");
const fnModeratePersona = httpsCallable<{ prompt: string }, { approved: boolean, reason?: string }>(functions, "moderatePersona");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fnGenerateGeminiPersona = httpsCallable<{ prompt: string }, any>(functions, "generateGeminiPersona");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converte o arquivo físico para Base64 para trafegar na Cloud Function */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // Remove o prefixo (data:image/png;base64,)
    };
    reader.onerror = error => reject(error);
  });
}

/** Faz o upload do arquivo chamando a Cloud Function segura */
async function uploadFileToGemini(file: File): Promise<{ fileUri: string, mimeType: string }> {
  const base64Data = await fileToBase64(file);

  const result = await fnUploadFileGemini({
    base64Data,
    mimeType: file.type,
    size: file.size
  });

  return result.data;
}

/** Converts our Message[] history to the SDK Content[] format */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function historyToContents(history: Message[]): any[] {
  const EXPIRATION_TIME_MS = 47 * 60 * 60 * 1000;
  const now = Date.now();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return history.map((msg): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    if (msg.fileUri && msg.fileMimeType) {
      const messageAge = now - msg.createdAt;

      if (messageAge < EXPIRATION_TIME_MS) {
        parts.push({ fileData: { fileUri: msg.fileUri, mimeType: msg.fileMimeType } });
      } else {
        const fileName = msg.attachmentName || "Arquivo anexo";
        parts.push({
          text: `[AVISO DE SISTEMA: O usuário enviou um arquivo chamado "${fileName}" nesta parte da conversa, mas o acesso a ele expirou (limite de 48 horas). Você NÃO pode mais ler este arquivo. Se o usuário fizer qualquer pergunta pedindo detalhes, resumos ou explicações sobre o conteúdo dele, VOCÊ ESTÁ PROIBIDO DE INVENTAR INFORMAÇÕES. Responda imediatamente dentro da sua personalidade que você não tem mais acesso ao documento e peça para o usuário enviar o arquivo novamente.]`
        });
      }
    }

    if (msg.text) parts.push({ text: msg.text });

    return { role: msg.role === "user" ? "user" : "model", parts };
  });
}

/** Builds the multipart user turn from text + optional file */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildUserParts(userText: string, file?: File): Promise<{ parts: any[], fileUri?: string, fileMimeType?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [];
  let fileUri: string | undefined;
  let fileMimeType: string | undefined;

  if (file) {
    const isPlainText = /\.(txt|htm|html|json|xml|csv)$/i.test(file.name);

    if (isPlainText) {
      const text = await file.text();
      parts.push({ text: `[Arquivo: ${file.name}]\n\n${text}` });
    } else {
      const uploadResult = await uploadFileToGemini(file);
      fileUri = uploadResult.fileUri;
      fileMimeType = uploadResult.mimeType;

      parts.push({ fileData: { fileUri, mimeType: fileMimeType } });

      if (file.type.startsWith("audio/")) {
        parts.push({ text: "O usuário enviou uma mensagem de voz. Transcreva o que foi dito e responda de acordo com sua personalidade." });
        return { parts, fileUri, fileMimeType };
      }

      if (userText) parts.push({ text: userText });
      else parts.push({ text: `Analise o conteúdo deste arquivo: ${file.name}` });
      return { parts, fileUri, fileMimeType };
    }
  }

  if (userText) parts.push({ text: userText });
  return { parts, fileUri, fileMimeType };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendMessage(
  systemPrompt: string,
  history: Message[],
  userText: string,
  file?: File
): Promise<{ text: string, fileUri?: string, fileMimeType?: string }> {

  const historyContents = historyToContents(history);
  const { parts, fileUri, fileMimeType } = await buildUserParts(userText, file);

  // Chama o backend enviando o que a IA precisa saber
  const result = await fnSendGeminiMessage({
    systemPrompt,
    historyContents,
    userParts: parts
  });

  return { text: result.data.text, fileUri, fileMimeType };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function moderatePersona(
  systemPrompt: string,
  userId: string,
  personaName: string
): Promise<{ approved: true } | { approved: false; reason: string }> {
  const prompt = `Abaixo está um modelo de prompt para a criação de um persona de IA. Analise-o quanto à possibilidade de violar a "Política de Uso Proibido da IA Generativa".
Responda APENAS "NÃO" se não violar nenhuma política. Se violar, responda APENAS com o motivo, em no máximo 200 caracteres, sem introdução nem explicação extra.

Persona:
"${systemPrompt}"`;

  try {
    const result = await fnModeratePersona({ prompt });

    if (result.data.approved) return { approved: true };

    await logPersonaRejected({ userId, personaName, reason: result.data.reason!, systemPrompt });
    return { approved: false, reason: result.data.reason! };
  } catch (error) {
    console.warn("moderatePersona: call failed, allowing save.", error);
    return { approved: true };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePersona(name: string, userId: string): Promise<any | null> {
  const prompt = `Crie um personagem sobre "${name}". Se você identificar que ele é um personagem conhecido, use as informações reais sobre ele. Retorne APENAS um JSON válido, sem explicações, sem markdown, sem crases, sem texto adicional, preenchendo as seguintes informações do personagem:

nome -> O nome do personagem
emoji -> Um emoji que represente bem esse personagem
desc -> Uma descrição curta do peronagem
sexo -> Sexo do personagem (masculino, feminino, não-binário)
idade -> Possível idade do personagem
escolaridade -> Uma escolaridade para o personagem
profissao -> A profissão do personagem
especialidade -> No quê o personagem é especialista
historicoVida -> Uma breve história do personagem (max. 500 caracteres)
personalidadeExtra -> Personalidades e características extras do personagem (como ele se comunica, se tem humor, se é formal ou casual, se tem expressões favoritas...) (max. 500 caracteres)
objetivo -> O que esse personagem quer alcançar na conversa
regras -> Lista de comportamentos obrigatórios ou proibidos
estiloComunicacao -> formal, casual, sarcástico, motivador, técnico
modoPensamento-> analítico, criativo, crítico, didático, provocador
limitacoes -> o que ele NÃO faz ou NÃO SABE
maneirismos -> bordões ou estilo repetitivo de fala
tipoInteracao -> passivo | ativo | desafiador

Exemplo:
{
  "nome": "Prof. Matheus",
  "emoji": "👨‍🏫",
  "desc": "Professor que simplifica matemática ao extremo usando lógica e analogias do dia a dia",
  "sexo": "Masculino",
  "idade": 40,
  "escolaridade": "Doutorado em Matemática",
  "profissao": "Professor de Matemática",
  "especialidade": "Explicar matemática de forma simples e intuitiva",
  "historicoVida": "Depois de anos ensinando alunos com dificuldade, percebeu que o problema não era a matemática, mas a forma como ela era explicada. Desde então, desenvolveu um método baseado em simplificação extrema e analogias do cotidiano.",
  "personalidadeExtra": "Calmo, direto e extremamente didático. Odeia complicação desnecessária e sempre tenta reduzir tudo ao mais simples possível. Fala como alguém explicando para um amigo.",
  "objetivo": "Fazer o usuário entender qualquer conceito matemático da forma mais simples possível, sem decorar fórmulas",
  "regras": [
    "Sempre explicar com analogias simples do cotidiano",
    "Evitar linguagem técnica sempre que possível",
    "Quebrar o raciocínio em passos curtos",
    "Confirmar se o usuário entendeu antes de avançar"
  ],
  "estiloComunicacao": "casual e didático",
  "modoPensamento": "simplificador",
  "limitacoes": [
    "Não usa explicações longas",
    "Não apresenta fórmulas sem contexto",
    "Não assume que o usuário sabe o básico"
  ],
  "maneirismos": [
    "“Vamos simplificar isso:”",
    "“Pensa assim:”",
    "“Matemática é só lógica disfarçada.”"
  ],
  "tipoInteracao": "ativo"
}`;

  try {
    const result = await fnGenerateGeminiPersona({ prompt });
    await logPersonaGenerated({ userId, inputText: name, success: true });

    // Como a Cloud Function já usou JSON.parse e retornou um objeto Javascript, 
    // não precisamos fazer JSON.parse() aqui novamente.
    return result.data;
  } catch (error) {
    console.warn(`Falha ao criar persona no backend.`, error);
    await logPersonaGenerated({ userId, inputText: name, success: false });
    return null;
  }
}
