import { useEffect, useState } from "react";
import * as api from "../api";
import { FriendMini } from "../components/Shared";

export default function SearchPage({ q: initialQ, me, go, toast }) {
  const [q, setQ] = useState(initialQ || "");
  const [people, setPeople] = useState([]);
  const [comms, setComms] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => { setQ(initialQ || ""); if (initialQ) runSearch(initialQ); /* eslint-disable-next-line */ }, [initialQ]);

  async function runSearch(term) {
    const t = term.trim();
    if (!t) { setPeople([]); setComms([]); setSearched(false); return; }
    setSearched(true);
    try {
      const [blocks, peopleRows, commRows] = await Promise.all([api.getMyBlocks(me.id), api.searchPeople(t), api.searchCommunities(t)]);
      const blockedIds = new Set(blocks.map((b) => b.blocked_id));
      setPeople(peopleRows.filter((p) => p.id !== me.id && !blockedIds.has(p.id)));
      setComms(commRows);
    } catch (e) { toast("Erro na busca: " + e.message, "err"); }
  }

  return (
    <div className="card">
      <h3>Buscar</h3>
      <form onSubmit={(e) => { e.preventDefault(); runSearch(q); }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, @username ou comunidade..." style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 10, padding: "9px 13px", marginBottom: 14, fontFamily: "inherit" }} />
      </form>
      {!searched ? <div className="hint">Digite algo para buscar pessoas e comunidades.</div> : (
        <>
          <h3>Pessoas</h3>
          {people.length === 0 ? <div className="hint" style={{ marginBottom: 14 }}>Nenhuma pessoa encontrada.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 4, marginBottom: 14 }}>
              {people.map((u) => <FriendMini key={u.id} profile={u} onClick={() => go("profile", { username: u.username })} />)}
            </div>
          )}
          <h3>Comunidades</h3>
          {comms.length === 0 ? <div className="hint">Nenhuma comunidade encontrada.</div> : comms.map((c) => (
            <div key={c.id} className="ork-comm-card" onClick={() => go("community", { slug: c.slug })}>
              <div className="ork-comm-thumb">{c.image_url ? <img src={c.image_url} alt="" /> : c.name[0]}</div>
              <div><strong>{c.name}</strong></div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
