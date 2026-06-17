import { useState } from "react";

export default function PagamentoConcluido() {
    const [statusParams] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);

        return {
            metodo: queryParams.get("capture_method") || "",
            comprovanteUrl: queryParams.get("receipt_url") || "",
            pedidoId: queryParams.get("order_nsu") || "",
        };
    });

    const voltarParaOApp = () => {
        // Redireciona o usuário de volta para a tela principal do chat
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6!">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-4! text-center border border-gray-100">

                {/* Ícone Animado de Sucesso */}
                <div className="mx-auto flex justify-self-center items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6! animate-bounce">
                    <svg
                        className="h-10 w-10 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2!">Pedido Recebido!</h2>

                <p className="text-gray-600 mb-6!">
                    Seu pagamento foi processado com segurança pela <span className="infinitepay-text font-bold">InfinitePay</span> e o saldo está sendo atualizado.
                </p>

                {/* Detalhes da Transação Dinâmicos */}
                <div className="bg-gray-50 rounded-2xl p-4! text-left space-y-3! border border-gray-100 text-sm text-gray-600 mb-8!">
                    <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Status:</span>
                        <span className="font-semibold text-green-600 bg-green-50 px-2! py-0.5! rounded-full text-xs">
                            Aprovado / Em processamento
                        </span>
                    </div>

                    {statusParams.metodo && (
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-500">Forma de pagamento:</span>
                            <span className="font-semibold text-gray-700 capitalize">
                                {statusParams.metodo === "credit_card" ? "Cartão de Crédito" : "Pix"}
                            </span>
                        </div>
                    )}

                    {statusParams.metodo === "pix" && (
                        <p className="text-xs text-blue-600 bg-blue-50 p-2! rounded-xl mt-2!">
                            💡 Pagamentos via Pix podem levar até 2 minutos para atualizar o saldo no painel devido ao processamento bancário.
                        </p>
                    )}
                </div>

                {/* Ações */}
                <div className="space-y-3!">
                    <button
                        onClick={voltarParaOApp}
                        className="w-[90%] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3! px-6! rounded-xl transition-all duration-200 hover:shadow-lg"
                    >
                        Voltar para a Mano IA
                    </button>

                    {statusParams.comprovanteUrl && (
                        <>
                            <a
                                href={statusParams.comprovanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-gray-500 hover:text-gray-700 font-semibold py-2! text-sm transition-colors duration-200"
                            >
                                Visualizar comprovante oficial <sup>*</sup>
                            </a>

                            <p className="text-xs text-gray-500 mt-8!">
                                (*) Os pagamentos são processados pela <span className="infinitepay-text font-bold">InfinitePay</span> e podem aparecer em seu extrato
                                em nome de <span className="font-bold">Azinaldo Oliveira Barbosa</span>.
                            </p>
                        </>
                    )}
                </div>

            </div>

            <div className="mt-8! text-center text-xs text-gray-400">
                Mano IA © 2026 • Ambiente Seguro Checkout Integrado
            </div>
        </div>
    );
}