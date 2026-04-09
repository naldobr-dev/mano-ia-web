import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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

export const clearUserData = onCall(async (request) => {
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

export const deletePersona = onCall(async (request) => {
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

export const deleteConversation = onCall(async (request) => {
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
});
