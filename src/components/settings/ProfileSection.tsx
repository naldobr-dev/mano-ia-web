import { useState, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { toWebP } from "../../lib/imageUtils";
import type { User } from "firebase/auth";

interface Props { user: User | null; }

export default function ProfileSection({ user }: Props) {
  const { refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (user?.displayName ?? user?.email ?? "?")[0].toUpperCase();

  const handleSaveName = async () => {
    const currentUser = auth.currentUser; // Pega a instância viva aqui

    if (!currentUser || !name.trim()) return;
    setSaving(true);
    try {
      await updateProfile(currentUser, { displayName: name.trim() });
      await refreshUser();
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentUser = auth.currentUser; // Pega a instância viva aqui

    if (!file || !currentUser) return;

    setUploadingPhoto(true);
    try {
      // 1. Converte para WebP
      const webp = await toWebP(file, 0.88, 512);

      // 2. Referência no Storage usando o UID do usuário logado
      const sRef = storageRef(storage, `users/${currentUser.uid}/avatar.webp`);

      // 3. Upload
      await uploadBytes(sRef, webp);

      // 4. Pega a URL (Isso vai falhar se a regra de 'read' estiver errada)
      const url = await getDownloadURL(sRef);

      // 5. Atualiza o Perfil (Usando currentUser garantimos que getIdToken existe)
      await updateProfile(currentUser, {
        photoURL: `${url}&t=${Date.now()}` // Cache buster
      });

      // 6. Notifica o contexto para atualizar a UI
      await refreshUser();
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const joined = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";

  const photoURL = auth.currentUser?.photoURL ?? user?.photoURL;

  return (
    <div className="st-section">
      <p className="st-section__title">Perfil</p>
      <div className="st-profile">
        {/* Avatar */}
        <div className="st-avatar-wrap">
          <div
            className="st-avatar"
            style={{ backgroundImage: photoURL ? `url(${photoURL})` : undefined }}
          >
            {!photoURL && initials}
            {uploadingPhoto && (
              <div className="st-avatar__uploading">
                <span className="st-spinner st-spinner--sm" />
              </div>
            )}
          </div>
          <button className="st-avatar__edit-btn" onClick={() => fileRef.current?.click()} title="Trocar foto">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>
          </button>
          <input
            ref={fileRef} type="file" hidden
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Name + email */}
        <div className="st-profile__info">
          {editing ? (
            <div className="st-profile__edit-row">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="st-input st-input--inline"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditing(false); }}
              />
              <button onClick={handleSaveName} disabled={saving}
                className={`st-icon-btn st-icon-btn--confirm ${saved ? "st-icon-btn--saved" : ""}`}>
                {saving ? <span className="st-spinner st-spinner--sm" /> : "✓"}
              </button>
              <button onClick={() => setEditing(false)} className="st-icon-btn">✕</button>
            </div>
          ) : (
            <div className="st-profile__name-row">
              <p className="st-profile__name">{auth.currentUser?.displayName ?? user?.displayName ?? "—"}</p>
              <button className="st-edit-badge" onClick={() => setEditing(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-mt-1!"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /><path d="M16 19h6" /></svg>
                editar</button>
            </div>
          )}
          <p className="st-profile__email">{user?.email}</p>
          <p className="st-profile__joined">Membro desde {joined}</p>
        </div>
      </div>
    </div>
  );
}
