import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase"

export interface CreditosData {
    totais: number;
    gratis: number;
    pagos: number;
}

export function useCreditos() {
    const [creditos, setCreditos] = useState<CreditosData>({ totais: 0, gratis: 0, pagos: 0 });

    // Usamos uma Ref para evitar que a função seja chamada múltiplas vezes 
    // enquanto o servidor ainda está processando o primeiro pedido.
    const pendingRenewal = useRef(false);

    useEffect(() => {
        const auth = getAuth();

        // O onAuthStateChanged garante que só vamos tentar ler o banco 
        // quando tivermos certeza de quem é o usuário logado.
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuário logado: cria a referência para o documento dele
                const userRef = doc(db, `users/${user.uid}`);

                // onSnapshot começa a escutar mudanças nesse documento em tempo real
                const unsubscribeSnapshot = onSnapshot(
                    userRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();

                            // Lembrando da lógica que fizemos no backend:
                            // O usuário tem créditos gratuitos (bônus diário) e créditos pagos.
                            // Somamos os dois para exibir o saldo total disponível.
                            const pagos = data.creditosPagos || 0;
                            const gratis = data.creditosGratis || 0;

                            setCreditos({
                                totais: pagos + gratis,
                                gratis,
                                pagos
                            });

                            // --- LÓGICA DE RENOVAÇÃO DIÁRIA ---

                            // Converte o timestamp do Firestore para Data do JavaScript
                            const ultimaRenovacao = data.ultimaRenovacaoGratuita?.toDate();
                            const hoje = new Date();

                            // Fazemos uma verificação simples de dia, mês e ano.
                            const precisaRenovar = !ultimaRenovacao ||
                                hoje.getDate() !== ultimaRenovacao.getDate() ||
                                hoje.getMonth() !== ultimaRenovacao.getMonth() ||
                                hoje.getFullYear() !== ultimaRenovacao.getFullYear();

                            // Se precisa renovar E não há uma renovação em andamento, chama a Function
                            if (precisaRenovar && !pendingRenewal.current) {
                                pendingRenewal.current = true;

                                const updateFree = httpsCallable(functions, "updateFreeCredts");

                                updateFree()
                                    .then(() => {
                                        console.log("Créditos diários verificados/renovados com sucesso.");
                                        // Não precisamos resetar o pendingRenewal.current aqui, 
                                        // pois o novo snapshot que chegará do servidor com a data nova 
                                        // já vai fazer o 'precisaRenovar' virar false.
                                    })
                                    .catch((err) => {
                                        console.error("Erro ao tentar renovar créditos:", err);
                                        // Em caso de erro de rede, destravamos para o sistema tentar de novo
                                        pendingRenewal.current = false;
                                    });
                            }

                        } else {
                            setCreditos({ totais: 0, gratis: 0, pagos: 0 });
                        }
                    },
                    (error) => console.error("Erro ao escutar saldo:", error)
                );

                // Retorna a função de limpeza do snapshot caso o usuário deslogue
                return () => unsubscribeSnapshot();
            } else {
                // Usuário não logado
                setCreditos({ totais: 0, gratis: 0, pagos: 0 });
            }
        });

        // Limpa o listener de autenticação quando o componente for desmontado
        return () => unsubscribeAuth();
    }, []);

    return creditos;
}