import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";

type Message = {
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt: number;
    attachmentName?: string;
    attachmentType?: "image" | "audio" | "file";
};
type Conversation = {
    id: string;
    personaId: string;
    title: string;
    lastMsg: string;
    lastTime: string;
    unread: number;
    messages: Message[];
    createdAt: number;
};

admin.initializeApp();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertAuth(request: { auth?: { uid: string } }): string {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "A requisição deve ser feita por um usuário autenticado."
        );
    }
    return request.auth.uid;
}

// ─── clearUserData ────────────────────────────────────────────────────────────
// Apaga TUDO dentro de users/{uid}/personas (todas as personas, conversas e mensagens).

export const clearUserData = onCall(
    { region: "southamerica-east1" },
    async (request) => {
        const uid = assertAuth(request);

        try {
            const firestore = admin.firestore();
            await firestore.recursiveDelete(firestore.collection(`users/${uid}/personas`));
            return { success: true };
        } catch (error) {
            console.error("clearUserData error:", error);
            throw new HttpsError("internal", "Erro ao limpar dados.");
        }
    });

// ─── deletePersona ────────────────────────────────────────────────────────────
// Apaga um persona específico e TUDO abaixo dele:
//   users/{uid}/personas/{personaId}
//     └── conversations/{convId}
//           └── messages/{msgId}
//
// Parâmetros esperados no data: { personaId: string }

export const deletePersona = onCall(
    { region: "southamerica-east1" },
    async (request) => {
        const uid = assertAuth(request);

        const { personaId } = request.data as { personaId?: string };

        if (!personaId || typeof personaId !== "string") {
            throw new HttpsError("invalid-argument", "O campo 'personaId' é obrigatório.");
        }

        try {
            const firestore = admin.firestore();
            const personaRef = firestore.doc(`users/${uid}/personas/${personaId}`);

            // recursiveDelete apaga o documento + todas as subcoleções abaixo
            await firestore.recursiveDelete(personaRef);

            return { success: true };
        } catch (error) {
            console.error("deletePersona error:", error);
            throw new HttpsError("internal", "Erro ao excluir o personagem.");
        }
    });

// ─── deleteConversation ───────────────────────────────────────────────────────
// Apaga uma conversa específica e TUDO abaixo dela:
//   users/{uid}/personas/{personaId}/conversations/{convId}
//     └── messages/{msgId}
//
// Parâmetros esperados no data: { personaId: string, convId: string }

export const deleteConversation = onCall(
    { region: "southamerica-east1" },
    async (request) => {
        const uid = assertAuth(request);

        const { personaId, convId } = request.data as {
            personaId?: string;
            convId?: string;
        };

        if (!personaId || typeof personaId !== "string") {
            throw new HttpsError("invalid-argument", "O campo 'personaId' é obrigatório.");
        }
        if (!convId || typeof convId !== "string") {
            throw new HttpsError("invalid-argument", "O campo 'convId' é obrigatório.");
        }

        try {
            const firestore = admin.firestore();
            const convRef = firestore.doc(
                `users/${uid}/personas/${personaId}/conversations/${convId}`
            );

            await firestore.recursiveDelete(convRef);

            return { success: true };
        } catch (error) {
            console.error("deleteConversation error:", error);
            throw new HttpsError("internal", "Erro ao excluir a conversa.");
        }
    }
);


// ─── uploadFileGemini ─────────────────────────────────────────────────────────
// Recebe o arquivo em Base64, faz o upload para a File API do Google e retorna a URI.

export const uploadFileGemini = onCall(
    { region: "southamerica-east1", timeoutSeconds: 120 },
    async (request) => {
        assertAuth(request); // Garante que só usuários logados chamem

        const { base64Data, mimeType, size } = request.data as {
            base64Data?: string;
            mimeType?: string;
            size?: number;
            isTestMode?: boolean;
        };

        if (!base64Data || !mimeType || !size) {
            throw new HttpsError("invalid-argument", "Dados do arquivo ausentes.");
        }

        // Captura a origem da requisição (ex: "http://localhost:5173" ou "https://mano.ia.br")
        const origin = request.rawRequest?.headers?.origin || "";

        // Verifica se a chamada veio do ambiente de desenvolvimento local
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

        // Escolhe a chave baseada na origem
        const apiKey = isLocalhost
            ? process.env.GEMINI_API_KEY_FREE
            : process.env.GEMINI_API_KEY;

        if (!apiKey) throw new HttpsError("internal", "Chave do Gemini não configurada.");

        // Um log apenas para auditar no painel do Firebase qual chave foi usada
        //console.log(`Requisição vinda de ${origin || "desconhecido"} - Usando API: ${isLocalhost ? "FREE" : "PAID"}`);

        try {
            const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

            // Converte o base64 de volta para binário
            const buffer = Buffer.from(base64Data, "base64");

            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "X-Goog-Upload-Protocol": "raw",
                    "X-Goog-Upload-Header-Content-Type": mimeType,
                    "X-Goog-Upload-Header-Content-Length": size.toString(),
                    "Content-Type": mimeType,
                },
                body: buffer,
            });

            if (!response.ok) {
                console.error("Erro no Gemini:", await response.text());
                throw new HttpsError("internal", "Falha ao enviar arquivo para o Gemini.");
            }

            const data = await response.json();
            return {
                fileUri: data.file.uri,
                mimeType: data.file.mimeType,
            };
        } catch (error) {
            console.error("uploadFileGemini error:", error);
            throw new HttpsError("internal", "Erro interno no upload.");
        }
    }
);

// ─── updateFreeCredits ─────────────────────────────────────────────────────────
// Atualiza os créditos grátis diário do usuário

export const updateFreeCredts = onCall(
    { region: "southamerica-east1" },
    async (request) => {
        const uid = assertAuth(request);

        const firestore = admin.firestore();
        const userRef = firestore.doc(`users/${uid}`);
        const configCredits = firestore.doc("settings/credits"); // Configurações de créditos (ex: custo por mensagem, bônus diário, etc.)

        try {
            await firestore.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const configCreditsDoc = await transaction.get(configCredits);

                const BONUS_DIARIO = configCreditsDoc.data()?.bonusDiario || 50; // Bônus diário padrão

                if (!userDoc.exists) {
                    throw new HttpsError("not-found", "Perfil de usuário não encontrado.");
                }

                const userData = userDoc.data()!;
                let creditosGratis = userData.creditosGratis || 0;

                // Recupera a data da última renovação (salva como Timestamp do Firestore)
                const agora = new Date();
                agora.setHours(agora.getHours() - 3); // Ajuste para o horário de Brasília (UTC-3)

                const ultimaRenovacao = userData.ultimaRenovacaoGratuita?.toDate();
                if (ultimaRenovacao) {
                    ultimaRenovacao.setHours(ultimaRenovacao.getHours() - 3);
                }

                // Regra: Se nunca renovou OU a última renovação foi em um dia diferente do atual
                const precisaRenovar = !ultimaRenovacao ||
                    agora.getDate() !== ultimaRenovacao.getDate() ||
                    agora.getMonth() !== ultimaRenovacao.getMonth() ||
                    agora.getFullYear() !== ultimaRenovacao.getFullYear();

                if (precisaRenovar) creditosGratis = BONUS_DIARIO;

                // Salva os novos saldos e atualiza a data de renovação (se tiver mudado)
                const dadosParaAtualizar: any = { creditosGratis };
                if (precisaRenovar) {
                    dadosParaAtualizar.ultimaRenovacaoGratuita = admin.firestore.FieldValue.serverTimestamp();
                }

                transaction.update(userRef, dadosParaAtualizar);
            });

        } catch (error: any) {
            // Se falhar, repassamos o erro
            console.error("Erro ao atualizar créditos grátis:", error);
            throw new HttpsError(error.code || "internal", error.message || "Erro ao processar créditos.");
        }
    }
);

// ─── sendGeminiMessage ────────────────────────────────────────────────────────
// Recebe o histórico montado e envia para o Gemini usando a chave do servidor.

export const sendGeminiMessage = onCall(
    { region: "southamerica-east1", timeoutSeconds: 60 },
    async (request) => {
        const uid = assertAuth(request);
        const { systemPrompt, historyContents, userParts } = request.data;

        if (!userParts) throw new HttpsError("invalid-argument", "Partes do usuário ausentes.");

        // Captura a origem da requisição (ex: "http://localhost:5173" ou "https://mano.ia.br")
        const origin = request.rawRequest?.headers?.origin || "";

        // Verifica se a chamada veio do ambiente de desenvolvimento local
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

        // Escolhe a chave baseada na origem
        const apiKey = isLocalhost
            ? process.env.GEMINI_API_KEY_FREE
            : process.env.GEMINI_API_KEY;

        if (!apiKey) throw new HttpsError("internal", "Chave do Gemini não configurada.");

        // Um log apenas para auditar no painel do Firebase qual chave foi usada
        //console.log(`Requisição vinda de ${origin || "desconhecido"} - Usando API: ${isLocalhost ? "FREE" : "PAID"}`);

        const firestore = admin.firestore();
        const userRef = firestore.doc(`users/${uid}`);
        const configAiRef = firestore.doc("settings/ai"); // Configurações globais da AI
        const configCredits = firestore.doc("settings/credits"); // Configurações de créditos (ex: custo por mensagem, bônus diário, etc.)

        let modelName = "gemini-3.1-flash-lite"; // Fallback padrão

        // Variáveis para guardar exatamente o que foi debitado para um possível reembolso
        let deduzidoGratis = 0;
        let deduzidoPago = 0;

        try {
            // 1. FASE DE RESERVA (PRE-AUTH)
            await firestore.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const configDoc = await transaction.get(configAiRef);
                const configCreditsDoc = await transaction.get(configCredits);

                const CUSTO_MENSAGEM = configCreditsDoc.data()?.custoMensagem || 3; // Custo padrão se não estiver configurado
                const BONUS_DIARIO = configCreditsDoc.data()?.bonusDiario || 50; // Bônus diário padrão

                if (!userDoc.exists) {
                    throw new HttpsError("not-found", "Perfil de usuário não encontrado.");
                }

                // Aproveita para pegar o modelo atualizado do banco (ou via o Mapping/Alias anterior)
                if (configDoc.exists && configDoc.data()?.modelName) {
                    modelName = configDoc.data()?.modelName;
                }

                const userData = userDoc.data()!;
                let creditosGratis = userData.creditosGratis || 0;
                let creditosPagos = userData.creditosPagos || 0;

                // Recupera a data da última renovação (salva como Timestamp do Firestore)
                const agora = new Date();
                agora.setHours(agora.getHours() - 3); // Ajuste para o horário de Brasília (UTC-3)

                const ultimaRenovacao = userData.ultimaRenovacaoGratuita?.toDate();
                if (ultimaRenovacao) {
                    ultimaRenovacao.setHours(ultimaRenovacao.getHours() - 3);
                }

                // Regra: Se nunca renovou OU a última renovação foi em um dia diferente do atual
                const precisaRenovar = !ultimaRenovacao ||
                    agora.getDate() !== ultimaRenovacao.getDate() ||
                    agora.getMonth() !== ultimaRenovacao.getMonth() ||
                    agora.getFullYear() !== ultimaRenovacao.getFullYear();

                if (precisaRenovar) creditosGratis = BONUS_DIARIO;

                // Verifica se o saldo total é suficiente
                if ((creditosGratis + creditosPagos) < CUSTO_MENSAGEM) {
                    throw new HttpsError("resource-exhausted", "Saldo de créditos insuficiente.");
                }

                // Lógica de débito: Primeiro do gratuito, o resto do pago
                let restanteParaDebitar = CUSTO_MENSAGEM;

                if (creditosGratis >= restanteParaDebitar) {
                    deduzidoGratis = restanteParaDebitar; // Guarda o valor debitado
                    creditosGratis -= restanteParaDebitar;
                    restanteParaDebitar = 0;
                } else {
                    deduzidoGratis = creditosGratis; // Guarda o valor debitado
                    restanteParaDebitar -= creditosGratis;
                    creditosGratis = 0;
                }

                if (restanteParaDebitar > 0) {
                    deduzidoPago = restanteParaDebitar; // Guarda o valor debitado
                    creditosPagos -= restanteParaDebitar;
                }

                // Salva os novos saldos e atualiza a data de renovação (se tiver mudado)
                const dadosParaAtualizar: any = { creditosGratis, creditosPagos };
                if (precisaRenovar) {
                    dadosParaAtualizar.ultimaRenovacaoGratuita = admin.firestore.FieldValue.serverTimestamp();
                }

                transaction.update(userRef, dadosParaAtualizar);
            });

        } catch (error: any) {
            // Se a transação falhar (ex: sem saldo), repassamos o erro sem tentar chamar a API
            console.error("Erro na transação de créditos:", error);
            throw new HttpsError(error.code || "internal", error.message || "Erro ao processar créditos.");
        }

        // Se a transação passou com sucesso, os créditos foram debitados. 
        // Agora chamamos a API com o modelName recuperado com segurança.

        // 2. FASE DE CONSUMO (CHAMADA À API)
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 2048,
                    ...({
                        thinkingConfig: {
                            thinkingBudget: 2048 // Valor em tokens (ex: 2048 é um excelente "Medium")
                        }
                    } as any)
                },
            });

            const chat = model.startChat({
                history: historyContents || [],
            });
            const result = await chat.sendMessage(userParts);

            return { text: result.response.text() };

        } catch (error) {
            // 3. FASE DE REEMBOLSO (ROLLBACK) EM CASO DE ERRO NA API
            console.error("sendGeminiMessage error. Iniciando reembolso...", error);

            try {
                // Devolve apenas se algo realmente foi deduzido na Fase 1
                if (deduzidoGratis > 0 || deduzidoPago > 0) {
                    const dadosReembolso: any = {};

                    if (deduzidoGratis > 0) {
                        dadosReembolso.creditosGratis = admin.firestore.FieldValue.increment(deduzidoGratis);
                    }
                    if (deduzidoPago > 0) {
                        dadosReembolso.creditosPagos = admin.firestore.FieldValue.increment(deduzidoPago);
                    }

                    await userRef.update(dadosReembolso);
                    console.log(`Reembolso efetuado: ${deduzidoGratis} grátis, ${deduzidoPago} pagos.`);
                }
            } catch (refundError) {
                // Apenas loga para auditoria caso o reembolso falhe (muito raro)
                console.error("CRÍTICO: Falha ao reembolsar créditos do usuário:", refundError);
            }

            // Lança o erro para o Frontend avisando que deu erro, mas o saldo está seguro
            throw new HttpsError("internal", "Erro ao gerar resposta da IA. Seus créditos foram devolvidos. Tente novamente.");
        }
    }
);

// ── saveNewConversation ─────────────────────────────────────────────────────────────────
// Função para criar uma nova conversa vazia. O Frontend chama ela quando o usuário clica em "Nova Conversa", 
// e depois entende que é uma conversa nova sem mensagens e não tenta carregar nada. O ID da conversa já é 
// gerado no Frontend (com nanoid) para facilitar a criação imediata da referência de mensagens abaixo dela.
// Valores esperados no data:
//userId: string,
//personaId: string,
//convo: Omit<Conversation, "messages">
export const saveNewConversation = onCall(
    { region: "southamerica-east1", timeoutSeconds: 30 },
    async (request) => {
        assertAuth(request);
        const { userId, personaId, convo } = request.data as {
            userId?: string;
            personaId?: string;
            convo?: Omit<Conversation, "messages">;
        };

        if (!userId || !personaId || !convo) {
            throw new HttpsError("invalid-argument", "Parâmetros ausentes ou inválidos.");
        }

        const firestore = admin.firestore();
        const userRef = firestore.doc(`users/${userId}`);
        const configCredits = firestore.doc("settings/credits"); // Configurações de créditos (ex: custo por mensagem, bônus diário, etc.)

        // Variáveis para guardar exatamente o que foi debitado para um possível reembolso
        let deduzidoGratis = 0;
        let deduzidoPago = 0;

        try {
            await firestore.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const configCreditsDoc = await transaction.get(configCredits);

                const CUSTO_PERSONA = configCreditsDoc.data()?.custoPorConversa || 5; // Custo padrão se não estiver configurado
                const BONUS_DIARIO = configCreditsDoc.data()?.bonusDiario || 50; // Bônus diário padrão

                const userData = userDoc.data()!;
                let creditosGratis = userData.creditosGratis || 0;
                let creditosPagos = userData.creditosPagos || 0;

                // Recupera a data da última renovação (salva como Timestamp do Firestore)
                const agora = new Date();
                agora.setHours(agora.getHours() - 3); // Ajuste para o horário de Brasília (UTC-3)

                const ultimaRenovacao = userData.ultimaRenovacaoGratuita?.toDate();
                if (ultimaRenovacao) {
                    ultimaRenovacao.setHours(ultimaRenovacao.getHours() - 3);
                }

                // Regra: Se nunca renovou OU a última renovação foi em um dia diferente do atual
                const precisaRenovar = !ultimaRenovacao ||
                    agora.getDate() !== ultimaRenovacao.getDate() ||
                    agora.getMonth() !== ultimaRenovacao.getMonth() ||
                    agora.getFullYear() !== ultimaRenovacao.getFullYear();

                if (precisaRenovar) creditosGratis = BONUS_DIARIO;

                // Verifica se o saldo total é suficiente
                if ((creditosGratis + creditosPagos) < CUSTO_PERSONA) {
                    throw new HttpsError("resource-exhausted", "Saldo de créditos insuficiente.");
                }

                // Lógica de débito: Primeiro do gratuito, o resto do pago
                let restanteParaDebitar = CUSTO_PERSONA;

                if (creditosGratis >= restanteParaDebitar) {
                    deduzidoGratis = restanteParaDebitar; // Guarda o valor debitado
                    creditosGratis -= restanteParaDebitar;
                    restanteParaDebitar = 0;
                } else {
                    deduzidoGratis = creditosGratis; // Guarda o valor debitado
                    restanteParaDebitar -= creditosGratis;
                    creditosGratis = 0;
                }

                if (restanteParaDebitar > 0) {
                    deduzidoPago = restanteParaDebitar; // Guarda o valor debitado
                    creditosPagos -= restanteParaDebitar;
                }

                // Salva os novos saldos e atualiza a data de renovação (se tiver mudado)
                const dadosParaAtualizar: any = { creditosGratis, creditosPagos };
                if (precisaRenovar) {
                    dadosParaAtualizar.ultimaRenovacaoGratuita = admin.firestore.FieldValue.serverTimestamp();
                }

                transaction.update(userRef, dadosParaAtualizar);
            });
            // users/[userId]/personas/[personaId]/conversations/[convo.id]/messages
            await firestore.doc(`users/${userId}/personas/${personaId}/conversations/${convo.id}`).set({
                ...convo,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true };
        } catch (error) {
            console.error("saveNewConversation error:", error);

            try {
                // Devolve apenas se algo realmente foi deduzido na Fase 1
                if (deduzidoGratis > 0 || deduzidoPago > 0) {
                    const dadosReembolso: any = {};

                    if (deduzidoGratis > 0) {
                        dadosReembolso.creditosGratis = admin.firestore.FieldValue.increment(deduzidoGratis);
                    }
                    if (deduzidoPago > 0) {
                        dadosReembolso.creditosPagos = admin.firestore.FieldValue.increment(deduzidoPago);
                    }

                    await userRef.update(dadosReembolso);
                    console.log(`Reembolso efetuado: ${deduzidoGratis} grátis, ${deduzidoPago} pagos.`);
                }
            } catch (refundError) {
                // Apenas loga para auditoria caso o reembolso falhe (muito raro)
                console.error("CRÍTICO: Falha ao reembolsar créditos do usuário:", refundError);
            }

            throw new HttpsError("internal", "Erro ao criar nova conversa.");
        }
    }
);

// ─── generateGeminiPersona ─────────────────────────────────────────────────────────────
// Recebe um prompt do usuário, envia para o Gemini e retorna a resposta para criar um persona.

export const generateGeminiPersona = onCall(
    { region: "southamerica-east1", timeoutSeconds: 60 },
    async (request) => {
        assertAuth(request); // Garante que só usuários logados chamem

        const { prompt } = request.data;

        if (!prompt || typeof prompt !== "string") {
            throw new HttpsError("invalid-argument", "Prompt ausente ou inválido.");
        }

        // Captura a origem da requisição (ex: "http://localhost:5173" ou "https://mano.ia.br")
        const origin = request.rawRequest?.headers?.origin || "";

        // Verifica se a chamada veio do ambiente de desenvolvimento local
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

        // Escolhe a chave baseada na origem
        const apiKey = isLocalhost
            ? process.env.GEMINI_API_KEY_FREE
            : process.env.GEMINI_API_KEY;

        if (!apiKey) throw new HttpsError("internal", "Chave do Gemini não configurada.");

        // Um log apenas para auditar no painel do Firebase qual chave foi usada
        //console.log(`Requisição vinda de ${origin || "desconhecido"} - Usando API: ${isLocalhost ? "FREE" : "PAID"}`);

        const firestore = admin.firestore();
        const configAiRef = firestore.doc("settings/ai"); // Configurações globais

        let moderationModelName = "gemini-2.5-flash-lite";

        try {
            await firestore.runTransaction(async (transaction) => {
                const configDoc = await transaction.get(configAiRef);

                if (configDoc.exists && configDoc.data()?.moderationModelName) {
                    moderationModelName = configDoc.data()?.moderationModelName;
                }
            });

            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: moderationModelName,
                generationConfig: {
                    temperature: 0.9,
                    responseMimeType: "application/json",
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                ],
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Tenta parsear a resposta como JSON
            try {
                const parsed = JSON.parse(text);

                return parsed;
            } catch (parseError) {
                console.error("Erro ao parsear resposta do Gemini:", parseError, "Resposta original:", text);
                throw new HttpsError("internal", "Resposta do Gemini em formato inesperado.");
            }
        } catch (error) {
            console.error("generateGeminiPersona error:", error);
            throw new HttpsError("internal", "Erro ao gerar personagem com a IA.");
        }
    }
);

// ─── moderatePersona ─────────────────────────────────────────────────────────────
// Recebe a descrição do persona e usa a API de Moderação do Google para verificar se ela é segura.

export const moderatePersona = onCall(
    { region: "southamerica-east1", timeoutSeconds: 30 },
    async (request) => {
        assertAuth(request); // Garante que só usuários logados chamem

        const { prompt } = request.data;

        if (!prompt || typeof prompt !== "string") {
            throw new HttpsError("invalid-argument", "Prompt ausente ou inválido.");
        }

        // Captura a origem da requisição (ex: "http://localhost:5173" ou "https://mano.ia.br")
        const origin = request.rawRequest?.headers?.origin || "";

        // Verifica se a chamada veio do ambiente de desenvolvimento local
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

        // Escolhe a chave baseada na origem
        const apiKey = isLocalhost
            ? process.env.GEMINI_API_KEY_FREE
            : process.env.GEMINI_API_KEY;

        if (!apiKey) throw new HttpsError("internal", "Chave do Gemini não configurada.");

        // Um log apenas para auditar no painel do Firebase qual chave foi usada
        //console.log(`Requisição vinda de ${origin || "desconhecido"} - Usando API: ${isLocalhost ? "FREE" : "PAID"}`);

        const firestore = admin.firestore();
        const configAiRef = firestore.doc("settings/ai"); // Configurações globais

        let moderationModelName = "gemini-2.5-flash-lite"; // Fallback padrão

        try {
            await firestore.runTransaction(async (transaction) => {
                const configDoc = await transaction.get(configAiRef);

                if (configDoc.exists && configDoc.data()?.moderationModelName) {
                    moderationModelName = configDoc.data()?.moderationModelName;
                }
            });

            const genAI = new GoogleGenerativeAI(apiKey);

            const model = genAI.getGenerativeModel({
                model: moderationModelName,
                // Temperature 0 = decisões de moderação determinísticas e consistentes.
                generationConfig: { temperature: 0, maxOutputTokens: 1000 },
                // Mantenha as configurações de segurança permissivas para que o modelo 
                // possa *descrever* as violações sem ser bloqueado pelos filtros de segurança.
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                ],
            });

            const result = await model.generateContent(prompt);
            const raw = result.response.text().trim();

            // Qualquer resposta que seja exatamente "NÃO" (sem distinção entre maiúsculas e minúsculas) significa aprovada.
            if (/^não$/i.test(raw)) {
                return { approved: true };
            }

            // Caso contrário, o modelo retornou o motivo da violação.
            return { approved: false, reason: raw };
        } catch (error) {
            console.error("moderatePersona error:", error);
            return { approved: true }; // Em caso de erro na moderação, aprova por padrão para não bloquear a criação do persona
        }
    }
);

/* ══════════════════════════════════════════════════════════════
   Funções relacionadas à compra de créditos e integração com a InfinitePay.
══════════════════════════════════════════════════════════════ */

// ─── Catálogo de Pacotes (Fonte da Verdade) ───────────────────────────────────
const PACKAGES_WEB: Record<string, { credits: number; price: number; title: string }> = {
    "pacote_teste_cartao": { credits: 15, price: 2.00, title: "Pacote de Teste (15 créditos)" },
    "pacote_teste_pix": { credits: 10, price: 1.00, title: "Pacote de Teste (10 créditos)" },
    "pacote_50": { credits: 50, price: 5.49, title: "50 Créditos Mano IA" },
    "pacote_160": { credits: 160, price: 15.90, title: "160 Créditos Mano IA" },
    "pacote_450": { credits: 450, price: 39.90, title: "450 Créditos Mano IA" },
};

// ─── createInfinitePayCheckout ────────────────────────────────────────────────
// Chamada pelo Frontend React para gerar a URL de pagamento.

export const createInfinitePayCheckout = onCall(
    { region: "southamerica-east1", timeoutSeconds: 30 },
    async (request) => {
        const uid = assertAuth(request);

        const { packageId, returnUrl } = request.data as {
            packageId: string;
            returnUrl: string;
        };

        const selectedPackage = PACKAGES_WEB[packageId];
        if (!selectedPackage) {
            throw new HttpsError("invalid-argument", "Pacote inválido ou não encontrado.");
        }

        const handle = process.env.INFINITEPAY_HANDLE;
        if (!handle) {
            throw new HttpsError("internal", "Handle da InfinitePay não configurada.");
        }

        // Criamos um identificador único para rastrear no sistema e guardar metadados [cite: 56]
        const orderNsu = `${uid}-${packageId}-${Date.now()}`;

        // O valor do produto deve ser colocado em centavos [cite: 44]
        const precoEmCentavos = Math.round(selectedPackage.price * 100);

        try {
            // Requisição POST direta para a API [cite: 23]
            const response = await fetch("https://api.checkout.infinitepay.io/links", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    handle: handle, // Identifica a conta [cite: 26]
                    order_nsu: orderNsu, // Opcional, mas vital para o nosso Webhook [cite: 55, 56]
                    redirect_url: returnUrl, // URL de sucesso [cite: 67]
                    // URL pública para onde a InfinitePay enviará o status da venda 
                    // Substitua pela URL real da sua function após o deploy (https://infinitepaywebhook-7wqvthkdda-rj.a.run.app)
                    webhook_url: "https://infinitepaywebhook-7wqvthkdda-rj.a.run.app",
                    items: [ // É obrigatório ter pelo menos 1 item [cite: 33]
                        {
                            quantity: 1, // [cite: 38]
                            price: precoEmCentavos, // [cite: 39]
                            description: selectedPackage.title, // [cite: 40]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error("Erro da InfinitePay:", errorData);
                throw new HttpsError("internal", "Falha ao gerar link de pagamento na InfinitePay.");
            }

            const data = await response.json();

            // A InfinitePay deve retornar um objeto com o link de pagamento. 
            // O formato exato da resposta de criação do link geralmente contém uma URL.
            // Retornamos essa URL para o frontend redirecionar o usuário.
            return { url: data.url || data.link };

        } catch (error) {
            console.error("Erro ao comunicar com InfinitePay:", error);
            throw new HttpsError("internal", "Erro de comunicação com o gateway de pagamento.");
        }
    }
);

// ─── infinitePayWebhook ───────────────────────────────────────────────────────
// Recebe a confirmação de pagamento aprovado automaticamente.

export const infinitePayWebhook = onRequest(
    { region: "southamerica-east1" },
    async (req, res) => {
        const data = req.body;

        // Se os dados não vierem corretamente, abortamos retornando 400
        if (!data || !data.order_nsu || !data.transaction_nsu) {
            res.status(400).send("Bad Request: Dados incompletos");
            return;
        }

        // Recuperamos as informações do pedido a partir do order_nsu 
        // Formato que criamos: UID_PACKAGEID_TIMESTAMP
        const partes = data.order_nsu.split("-");

        // Se bater um pagamento do seu teste antigo (que usava "_"), vamos apenas ignorar 
        // para não quebrar a função, retornando 200 para a InfinitePay parar de insistir.
        if (partes.length < 3) {
            console.log("Ignorando order_nsu em formato antigo ou inválido:", data.order_nsu);
            res.status(200).send("Ignored");
            return;
        }

        const uid = partes[0];
        const packageId = partes[1]; // Agora será exatamente "pacote_50"

        const selectedPackage = PACKAGES_WEB[packageId];
        if (!selectedPackage) {
            console.error("Pacote não encontrado no catálogo:", packageId);
            res.status(200).send("Package not found");
            return;
        }

        const creditsToAdd = selectedPackage.credits;
        const firestore = admin.firestore();

        // Guarde o transaction_nsu pra futuras consultas e para evitar pagamentos duplicados [cite: 150]
        const transactionRef = firestore.doc(`transactions/${data.transaction_nsu}`);

        try {
            await firestore.runTransaction(async (t) => {
                const doc = await t.get(transactionRef);
                if (doc.exists) {
                    // Transação já foi computada
                    return;
                }

                const userRef = firestore.doc(`users/${uid}`);

                // Registra os detalhes da transação usando os dados do webhook
                t.set(transactionRef, {
                    paymentId: data.transaction_nsu, // ID único da transação [cite: 122]
                    invoiceSlug: data.invoice_slug || null, // Código da fatura [cite: 117]
                    userId: uid,
                    packageId: packageId,
                    amount: data.amount / 100, // Retornando para reais [cite: 118]
                    paidAmount: data.paid_amount / 100, // [cite: 119]
                    captureMethod: data.capture_method || "unknown", // "credit_card" ou "pix" [cite: 121]
                    creditsAdded: creditsToAdd,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    provider: "infinitepay"
                });

                // Credita os fundos no perfil do usuário
                // Uso do SET com MERGE para criar o documento do usuário se não existir
                t.set(userRef, {
                    creditosPagos: admin.firestore.FieldValue.increment(creditsToAdd)
                }, { merge: true });
            });

            console.log(`Sucesso (InfinitePay): ${creditsToAdd} créditos para o usuário ${uid} via ${data.capture_method || 'Pix/Cartão'}`);

            // Só liberamos a InfinitePay APÓS o banco de dados confirmar que salvou
            res.status(200).send("OK");

        } catch (dbError) {
            console.error("Erro ao atualizar banco no webhook InfinitePay:", dbError);
            res.status(500).send("Database Error");
        }
    }
);
