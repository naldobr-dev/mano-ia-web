import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";

interface Props { onClearData?: () => void; }

type ClearStatus = "idle" | "confirm" | "clearing" | "done" | "error";

export default function DangerSection({ onClearData }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ClearStatus>("idle");

  const handleClear = async () => {
    if (!user) return;
    setStatus("clearing");

    try {
      const clearData = httpsCallable(functions, 'clearUserData');

      await clearData();

      setStatus("done");
      onClearData?.();
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("confirm"), 2000);
    }
  };

  return (
    <div className="st-section">
      <p className="st-section__title">Zona de perigo</p>

      <div className="st-danger-box">
        <div
          className={`st-row st-row--danger ${status === "confirm" || status === "clearing" ? "st-row--active" : ""}`}
          onClick={() => status === "idle" && setStatus("confirm")}
        >
          <div className="st-row__icon-wrap st-row__icon-wrap--danger">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7614f" opacity={0.7} className="size-5">
              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="st-row__body">
            <p className="st-row__label st-row__label--danger">Limpar todos os dados</p>
            <p className="st-row__desc">Remove personagens, conversas e mensagens. Irreversível.</p>
          </div>
          {status === "idle" && <span className="st-row__chevron" style={{ color: "#f7614f" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f7614f" className="size-4"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /></svg>
          </span>}
        </div>

        {/* Confirmation box */}
        {status === "confirm" && (
          <div className="st-danger-confirm">
            <div className="st-danger-confirm__warning">
              ⚠ Todos os seus personagens, conversas e mensagens serão permanentemente excluídos. Esta ação <strong>não pode ser desfeita</strong>.
            </div>
            <div className="st-danger-confirm__actions">
              <button className="st-btn-ghost" onClick={() => setStatus("idle")}>
                Cancelar
              </button>
              <button className="st-btn-danger" onClick={handleClear}>
                Confirmar exclusão
              </button>
            </div>
          </div>
        )}

        {status === "clearing" && (
          <div className="st-danger-status">
            <span className="st-spinner st-spinner--sm" style={{ borderTopColor: "#f7614f", borderColor: "rgba(247,97,79,0.3)" }} />
            Removendo dados…
          </div>
        )}

        {status === "done" && (
          <div className="st-danger-status" style={{ color: "#3ecf8e" }}>
            ✓ Dados removidos com sucesso.
          </div>
        )}

        {status === "error" && (
          <div className="st-danger-status" style={{ color: "#f7614f" }}>
            ⚠ Erro ao remover dados. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
}
