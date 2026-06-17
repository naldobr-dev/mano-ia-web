import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { useCreditos } from "../../hooks/useCredits";
import "./CreditsPanel.css";

// Os mesmos pacotes que definimos no backend
const pacotes = [
    //{ id: "pacote_teste_cartao", credits: 15, price: 2.00, title: "Teste (cartão)" },
    //{ id: "pacote_teste_pix", credits: 10, price: 1.00, title: "Teste (Pix)" },

    { id: "pacote_50", credits: 50, price: "5,49", title: "50 Créditos" },
    { id: "pacote_160", credits: 160, price: "15,90", title: "160 Créditos", destaque: true },
    { id: "pacote_450", credits: 450, price: "39,90", title: "450 Créditos" },
];

interface Props {
    onClose: () => void; // Função para fechar o painel de créditos
}

export default function CreditsPanel({ onClose }: Props) {
    // Controla se estamos vendo o resumo ("summary") ou comprando ("store")
    const [viewMode, setViewMode] = useState<"summary" | "about-credits" | "store">("summary");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("pacote_160"); // Deixa o pacote do meio pré-selecionado

    // Busca os dados em tempo real
    const creditos = useCreditos();

    const handleCheckout = async () => {
        setLoading(true);
        setError("");

        //const functions = getFunctions(app, "southamerica-east1");
        const createCheckout = httpsCallable(functions, "createInfinitePayCheckout");

        try {
            // Pega a URL base do seu site atual (ex: http://localhost:5173 ou https://mano.ia.br)
            // e adiciona a rota de sucesso para onde a InfinitePay vai devolver o usuário
            const returnUrl = `${window.location.origin}/payment-success`;

            const result = await createCheckout({
                packageId: selectedPackage,
                returnUrl: returnUrl,
            });

            const data = result.data as { url: string };

            if (data && data.url) {
                // Redireciona o usuário para a página de pagamento segura da InfinitePay
                // Usamos window.open para abrir em uma nova aba, garantindo que o usuário não perca a página atual
                //window.open(data.url, '_blank', 'noopener,noreferrer');
                window.location.href = data.url; // Redireciona na mesma aba, para uma experiência mais fluida
            } else {
                setError("Erro inesperado: O link de pagamento não foi retornado.");
                setLoading(false);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Erro ao gerar checkout:", err);
            setError("Falha ao iniciar pagamento. Verifique sua conexão e tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="credits-backdrop">
            <div className="credits-modal">
                {/* Botão flutante para fechar o painel de créditos, caso queira */}
                <button
                    onClick={onClose}
                    className="absolute z-50 right-4 top-4 bg-[#1e212b] text-zinc-400 rounded-full p-2! hover:bg-[#2a2d3a] hover:text-white transition-all duration-200 opacity-70"
                    title="Fechar"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="w-full h-full overflow-y-auto p-4! pt-6! px-8! mx-auto">

                    {/* ─── TELA DE RESUMO DE CRÉDITOS ─── */}
                    {viewMode === "summary" && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
                            <h2 className="text-3xl font-bold mb-8! text-center text-(--text-primary)">Seu Saldo de Créditos</h2>

                            {/* Card Principal */}
                            <div className="bg-(--bg-card) border border-(--border) rounded-3xl p-8! w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden">
                                {/* Brilho de fundo decorativo */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                                <span className="text-5xl mb-4! drop-shadow-lg">💎</span>
                                <span className={`text-6xl font-black ${creditos.totais > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                    {creditos.totais}
                                </span>
                                <span className="text-zinc-400 mt-2! font-medium tracking-wide text-sm uppercase">Créditos Totais</span>
                            </div>

                            {/* Detalhamento */}
                            <div className="flex w-full max-w-sm justify-between bg-(--bg-secondary) rounded-2xl p-4! mt-6! border border-(--border)">
                                <div className="flex flex-col items-center w-1/2 border-r border-(--border)">
                                    <span className="text-zinc-500 text-xs font-semibold uppercase mb-1!">Gratuitos</span>
                                    <span className="text-xl font-bold text-green-400">{creditos.gratis}</span>
                                </div>
                                <div className="flex flex-col items-center w-1/2">
                                    <span className="text-zinc-500 text-xs font-semibold uppercase mb-1!">Pagos</span>
                                    <span className="text-xl font-bold text-blue-400">{creditos.pagos}</span>
                                </div>
                            </div>

                            {/* Link para entender mais sobre créditos */}
                            <button
                                onClick={() => setViewMode("about-credits")}
                                className="mt-4! text-blue-400 hover:text-blue-300 font-light text-xs underline cursor-pointer transition-colors"
                            >
                                Entenda mais sobre seus créditos
                            </button>

                            {/* Botão de Ação */}
                            <button
                                onClick={() => setViewMode("store")}
                                className="mt-10! bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5! px-8! rounded-full transition-all duration-200 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 transform hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                Comprar mais créditos
                            </button>
                        </div>
                    )}

                    {/* ─── TELA DE INFORMAÇÕES SOBRE CRÉDITOS ─── */}
                    {viewMode === "about-credits" && (
                        <div className="animate-in slide-in-from-right-8 duration-300 mb-8!">
                            {/* Botão Voltar */}
                            <button
                                onClick={() => setViewMode("summary")}
                                className="flex items-center gap-2 text-(--text-secondary) hover:text-(--accent) mb-6! transition-colors group"
                            >
                                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                Voltar para o saldo
                            </button>

                            <div className="text-center mb-8!">
                                <h2 className="text-3xl font-bold text-(--text-primary)">Entenda seus Créditos</h2>
                                <p className="mt-2! text-(--text-secondary)">Tudo o que você precisa saber sobre os créditos do Mano IA.</p>
                            </div>

                            <div className="text-left text-(--text-secondary) mt-8! font-normal text-sm max-w-2xl mx-auto">
                                <h3 className="text-xl font-bold mb-2!">O que são créditos?</h3>
                                <p className="mt-2!">Créditos são a moeda virtual do Mano IA, usados para acessar as funcionalidades de conversa com os personagens. Eles permitem que você crie novas conversas e envie mensagens para o personagem responder.</p>
                                <h3 className="text-xl font-bold mt-6! mb-2!">Como consumir créditos?</h3>
                                <p className="mt-2!">Cada conversa criada consome 5 créditos, e cada mensagem enviada consome 3 créditos. Os créditos gratuitos são consumidos primeiro, seguidos pelos créditos pagos.</p>
                                <p className="mt-2!">Você recebe gratuitamente 50 créditos todos os dias. Esses créditos gratuitos não se acumulam.</p>
                                <h3 className="text-xl font-bold mt-6! mb-2!">Como obter mais créditos?</h3>
                                <p className="mt-2!">Você pode obter mais créditos através da compra de pacotes na loja ou participando de promoções e atividades especiais.</p>
                            </div>
                        </div>
                    )}

                    {/* ─── TELA DE LOJA DE PACOTES ─── */}
                    {viewMode === "store" && (
                        <div className="animate-in slide-in-from-right-8 duration-300">
                            {/* Botão Voltar */}
                            <button
                                onClick={() => setViewMode("summary")}
                                className="flex items-center gap-2 text-(--text-secondary) hover:text-(--accent) mb-6! transition-colors group"
                            >
                                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                Voltar para o saldo
                            </button>

                            <div className="text-center mb-8!">
                                <h2 className="text-3xl font-bold text-(--text-primary)">Recarregue seus Créditos</h2>
                                <p className="mt-2! text-(--text-secondary)">Escolha o pacote ideal para continuar conversando com o Mano IA.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8!">
                                {pacotes.map((pacote) => (
                                    <div
                                        key={pacote.id}
                                        onClick={() => setSelectedPackage(pacote.id)}
                                        className={`relative p-6! rounded-2xl cursor-pointer border-2 transition-all duration-200 ${selectedPackage === pacote.id
                                            ? "border-blue-500 bg-(--bg-secondary) shadow-[0_0_15px_rgba(59,130,246,0.3)] transform scale-[1.02]"
                                            : "border-(--border) bg-(--bg-card) hover:border-(--accent)"
                                            }`}
                                    >
                                        {pacote.destaque && (
                                            <span className="absolute -top-3! left-1/2! transform -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold px-4! py-1! rounded-full whitespace-nowrap shadow-lg">
                                                Mais Popular
                                            </span>
                                        )}
                                        <h3 className="text-lg font-medium text-(--text-secondary) text-center">{pacote.title}</h3>
                                        <div className="mt-4! text-center flex items-start justify-center">
                                            <span className="text-sm font-medium text-(--text-secondary) mt-1">R$</span>
                                            <span className="text-4xl font-black text-(--text-primary) ml-1! tracking-tight">{pacote.price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="mb-6! p-4! bg-red-500/10 text-red-400 rounded-xl text-center border border-red-500/20 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-center">
                                <button
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    className={`px-10! py-4! rounded-full font-bold text-white transition-all duration-200 w-full md:w-auto shadow-lg ${loading
                                        ? "bg-zinc-600 cursor-not-allowed opacity-70"
                                        : "bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transform hover:-translate-y-0.5"
                                        }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Gerando link seguro...
                                        </span>
                                    ) : "Avançar para Pagamento"}
                                </button>
                            </div>

                            <p className="text-center text-(--text-muted) text-xs mt-8! pb-4!">
                                Ao clicar em avançar, você será redirecionado para a página segura da <strong className="infinitepay-text text-emerald-500 font-semibold">InfinitePay</strong>.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
