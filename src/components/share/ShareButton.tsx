import React from 'react';
import { useAuth } from "../../hooks/useAuth";

interface Props {
    onClose: () => void;
}

const ShareButton: React.FC<Props> = ({ onClose }) => {
    const { user } = useAuth();

    const handleShare = async () => {
        // Verifica se o navegador suporta a Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Mano IA",
                    text: 'Você precisa conhecer o Mano IA! Dá pra criar assistentes e personagens de IA do seu próprio jeito:',
                    url: `https://web.mano.ia.br/?u=${user?.uid}&m=shared&d=${new Date().getTime()}`,
                });
                // Para converter a data para uma data legível: const date = new Date(1782087007068);
                //console.log('Compartilhado com sucesso!'); https://web.mano.ia.br/?u=i7jAe99gKtbqwkNv7PsiFyiZxCN2&m=shared&d=1782087308759
            } catch (error) {
                // Captura caso o usuário cancele o compartilhamento
                console.log('Compartilhamento cancelado ou falhou:', error);
            }
        } else {
            // Fallback: Se não suportar, copia o link para a área de transferência
            try {
                await navigator.clipboard.writeText(`https://web.mano.ia.br/?u=${user?.uid}&m=shared&d=${new Date().getTime()}`);
                alert('Link copiado para a área de transferência! É só colar para o seu amigo.');
            } catch (err) {
                console.error('Erro ao copiar o link:', err);
            }
        }
    };

    return (
        <div className='relative p-5! text-center border-b border-b-gray-700 mb-4!'>
            {/* ─── Botão Fechar ─── */}
            <button
                onClick={onClose}
                className="absolute z-50 right-0 top-2 bg-[#1e212b] text-zinc-400 rounded-md border border-gray-600 p-0.5! hover:bg-[#2a2d3a] hover:text-white transition-all duration-200 opacity-70"
                title="Fechar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h1 className='text-(--text-primary) font-bold text-base'>Gostou do Mano IA?</h1>
            <p className='text-(--text-secondary) text-sm'>Compartilhe com um amigo!</p>
            <button
                onClick={handleShare}
                className="
                    relative w-full py-3! mt-4! rounded-xl text-sm font-bold text-gray-100 border-0 cursor-pointer

                    bg-[linear-gradient(135deg,#2563eb,#9333ea)]

                    shadow-[0_8px_30px_rgba(37,99,235,0.35)]

                    transition-all duration-300 ease-out

                    hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(147,51,234,0.45)]

                    active:scale-[0.98]
                "
            >
                <svg width="26" height="26" className='inline mr-1!' viewBox="0 -4.15 57.875 57.875"><g data-name="Group 37" stroke="#888" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"><path data-name="Path 95" d="M15.007 30.498v16.4l26.032-28.734Z" fill="#888" /><path data-name="Path 96" d="M18.396 33.057 55.875 2.371l-17.1 45.207Z" fill="#fff" /><path data-name="Path 97" d="M2 21.208 18.4 32.92 55.879 2Z" fill="#fff" /></g></svg>
                Compartilhar Agora!
            </button>
        </div>
    );
};

export default ShareButton;