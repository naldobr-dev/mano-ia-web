// ─── AppearanceSection ────────────────────────────────────────────────────────
import {
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid';

import { IconLogo } from "../../icons/IconLogo";

interface AppearanceProps {
  theme: "dark" | "light" | "auto";
  onThemeChange: (t: "dark" | "light" | "auto") => void;
}

export function AppearanceSection({ theme, onThemeChange }: AppearanceProps) {
  const opts: { id: "dark" | "light" | "auto"; label: string; icon: string }[] = [
    { id: "dark", label: "Escuro", icon: "🌙" },
    { id: "light", label: "Claro", icon: "☀️" },
    { id: "auto", label: "Sistema", icon: "💻" },
  ];

  return (
    <div className="st-section">
      <p className="st-section__title">Aparência</p>
      <div className="st-theme-grid">
        {opts.map(o => (
          <button
            key={o.id}
            className={`st-theme-btn ${theme === o.id ? "st-theme-btn--active" : ""}`}
            onClick={() => onThemeChange(o.id)}
          >
            <span className="st-theme-btn__icon">
              {o.id === "dark" ? <MoonIcon className="size-5" /> :
                o.id === "light" ? <SunIcon className="size-5" /> :
                  <ComputerDesktopIcon className="size-5" />}
            </span>
            <span className="st-theme-btn__label">{o.label}</span>
            {theme === o.id && <span className="st-theme-btn__dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── StatsSection ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { countTotalConversations } from "../../lib/firestore";

interface StatsProps {
  personaCount: number;
  // Firestore counts would be fetched here in a real impl
}

const MAX_FREE_PERSONAS = 5;

export function StatsSection({ personaCount }: StatsProps) {
  const { user } = useAuth();
  const [convCount, setConvCount] = useState<number | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);

  useEffect(() => {
    if (!user) return;
    //setLoadingConvs(true);
    countTotalConversations(user.uid)
      .then(setConvCount)
      .catch(() => setConvCount(null))
      .finally(() => setLoadingConvs(false));
  }, [user]);

  // TODO: fetch real conversation/message counts and storage bytes from Firestore
  //const placeholderConvos = 0;
  const placeholderMessages = '--'; // could be a spinner if we want to fetch real counts for this too
  const placeholderStorageMB = 14.2; // out of 100MB free storage for personas + convo history
  const storageMax = 100;
  const storagePct = Math.min((placeholderStorageMB / storageMax) * 100, 100);

  const cards = [
    {
      icon: "🤖",
      label: "Personas",
      value: personaCount,
      sub: `de ${MAX_FREE_PERSONAS} (máximo)`, //no plano grátis`,
    },
    {
      icon: "💬",
      label: "Conversas",
      value: convCount,
      loading: loadingConvs,
      sub: "total",
    },
    { label: "Mensagens", value: placeholderMessages, sub: "total", icon: "✉️" },
  ];

  return (
    <div className="st-section">
      <p className="st-section__title">Estatísticas</p>

      <div className="st-stats-grid">
        {cards.map((c, i) => (
          <div key={i} className="st-stat-card">
            <span className="st-stat-card__icon">
              {c.label === "Personas" ? <UserIcon className="size-5" /> :
                c.label === "Conversas" ? <ChatBubbleLeftRightIcon className="size-5" /> :
                  <ChatBubbleLeftIcon className="size-5" />}
            </span>
            <p className="st-stat-card__value">
              {"loading" in c && c.loading
                ? <span className="st-stat-card__spinner" />
                : (c.value ?? "—")}
            </p>
            <p className="st-stat-card__label">{c.label}</p>
            <p className="st-stat-card__sub">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Storage bar */}
      <div className="st-storage-bar">
        <div className="st-storage-bar__header">
          <p className="st-storage-bar__label">Armazenamento</p>
          <p className="st-storage-bar__value">{placeholderStorageMB} MB de {storageMax} MB</p>
        </div>
        <div className="st-storage-bar__track">
          <div
            className={`st-storage-bar__fill ${storagePct > 80 ? "st-storage-bar__fill--warn" : ""}`}
            style={{ width: `${storagePct}%` }}
          />
        </div>
        <p className="st-storage-bar__pct">{storagePct.toFixed(1)}% utilizado</p>
      </div>
    </div>
  );
}

// ─── AboutSection ─────────────────────────────────────────────────────────────

export function AboutSection() {
  return (
    <div className="st-section">
      <p className="st-section__title">Sobre</p>
      <div className="st-about-card">
        <div className="st-about-logo"><IconLogo className='m-2!' fill='#aaaaaa' /></div>
        <div className="st-about-info">
          <p className="st-about-name relative">Mano IA <span className="st-about-badge absolute right-0  -top-0.5">Estável</span></p>
          <p className="st-about-version">Versão {__APP_VERSION__} · Plano Gratuito</p>
          <p className="st-about-copy">© 2026 Mano IA · <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ display: 'inline', marginTop: '-1px' }}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" /></svg> mano.ia.br</p>
        </div>

      </div>
    </div>
  );
}
