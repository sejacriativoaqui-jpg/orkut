import { useState, useEffect } from "react";
import { timeAgo, REPORT_REASONS } from "../helpers";
import { getDailyQuote, uploadImage } from "../api";

export function Avatar({ profile, size = 40 }) {
  return (
    <div className="ork-mini-avatar" style={{ width: size, height: size }}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, background: "var(--purple-500)" }}>
          {profile?.name?.[0] || "?"}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, text }) {
  return <div className="ork-empty"><div className="ic">{icon}</div>{text}</div>;
}

export function LuckyCard() {
  const [text, setText] = useState("Carregando a sorte de hoje…");
  useEffect(() => { getDailyQuote().then(setText).catch(() => setText("Hoje é um bom dia para reviver boas lembranças.")); }, []);
  return (
    <div className="ork-lucky">
      <div className="lbl">✨ Sorte do dia</div>
      <p>{text}</p>
    </div>
  );
}

export function Switch({ on, onToggle }) {
  return <button type="button" className={`switch ${on ? "on" : ""}`} onClick={onToggle}><span className="knob" /></button>;
}

export function StatBox({ label, value }) {
  return (
    <div style={{ background: "var(--lilac-50)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--purple-700)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

export function FriendMini({ profile, onClick }) {
  return (
    <div className="friend-card" style={{ cursor: "pointer" }} onClick={onClick}>
      <Avatar profile={profile} size={44} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>@{profile.username}</div>
      </div>
    </div>
  );
}

export function ReportModal({ targetType, targetLabel, onSubmit, onClose }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");
  return (
    <div className="ork-modal-bg" onClick={onClose}>
      <div className="ork-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Denunciar {targetLabel}</h3>
        <div className="ork-field">
          <label>Motivo</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="ork-field"><label>Detalhes (opcional)</label><textarea rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ork-btn ork-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="ork-btn ork-btn-primary" onClick={() => { onSubmit(reason, detail); onClose(); }}>Enviar denúncia</button>
        </div>
      </div>
    </div>
  );
}

export function PostComposer({ meProfile, onSubmit, placeholder = "No que você está pensando?", communityMode = false }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true);
    try {
      await onSubmit({ text, file, title: communityMode ? title : null });
      setText(""); setFile(null); setPreview(null); setTitle("");
    } finally { setBusy(false); }
  }
  return (
    <form className="card" onSubmit={submit}>
      <div style={{ display: "flex", gap: 10 }}>
        <Avatar profile={meProfile} />
        <div style={{ flex: 1 }}>
          {communityMode && <input placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontFamily: "inherit" }} />}
          <textarea className="ork-postbox" style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 12, padding: "10px 12px", fontFamily: "inherit", fontSize: 14 }} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
          {preview && <img src={preview} className="att" alt="" style={{ maxHeight: 180 }} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <label className="link-btn" style={{ cursor: "pointer" }}>📷 Foto<input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} /></label>
            <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }} disabled={busy}>{busy ? "Publicando…" : "Publicar"}</button>
          </div>
        </div>
      </div>
    </form>
  );
}

export function PostCard({ post, author, meId, isAdmin, liked, likeCount, comments, commentAuthors, onToggleLike, onAddComment, onDelete, onOpenProfile }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  if (!author) return null;
  const canDelete = post.author_id === meId || isAdmin;

  return (
    <div className="ork-post">
      <div className="ork-post-head">
        <Avatar profile={author} />
        <div style={{ flex: 1 }}>
          <button className="link-btn" style={{ color: "var(--ink)", fontWeight: 700 }} onClick={() => onOpenProfile(author.username)}>{author.name}</button>
          {post.title && <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 1 }}>{post.title}</div>}
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>@{author.username} · {timeAgo(post.created_at)}</div>
        </div>
        {canDelete && <button className="link-btn" style={{ color: "var(--muted)" }} onClick={() => onDelete(post)}>Excluir</button>}
      </div>
      {post.text && <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45 }}>{post.text}</p>}
      {post.image_url && <img src={post.image_url} className="att" alt="" />}
      <div className="ork-post-actions">
        <button className={liked ? "liked" : ""} onClick={() => onToggleLike(post)}>{liked ? "💗" : "🤍"} {likeCount > 0 ? likeCount : ""} Curtir</button>
        <button onClick={() => setShowComments((s) => !s)}>💬 {comments.length > 0 ? comments.length : ""} Comentar</button>
      </div>
      {showComments && (
        <div style={{ marginTop: 10, paddingLeft: 6 }}>
          {comments.map((c) => {
            const cu = commentAuthors[c.author_id];
            return (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Avatar profile={cu} size={28} />
                <div style={{ background: "var(--lilac-50)", borderRadius: 10, padding: "6px 10px", fontSize: 13 }}>
                  <strong>{cu?.name}</strong> {c.text}
                </div>
              </div>
            );
          })}
          <form onSubmit={(e) => { e.preventDefault(); if (commentText.trim()) { onAddComment(post, commentText); setCommentText(""); } }} style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva um comentário…" style={{ flex: 1, border: "1.5px solid var(--line)", borderRadius: 20, padding: "7px 13px", fontFamily: "inherit", fontSize: 13 }} />
            <button className="ork-btn ork-btn-primary ork-btn-sm" style={{ width: "auto" }}>Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}

// helper de upload usado pelas páginas (evita repetir a lógica em cada lugar)
export async function uploadAndGetUrl(bucket, userId, file, maxSize) {
  return uploadImage(bucket, userId, file, maxSize);
}
