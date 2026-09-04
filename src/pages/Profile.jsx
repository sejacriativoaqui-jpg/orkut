import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { useAuth } from "../context/AuthContext";
import { Avatar, EmptyState, ReportModal } from "../components/Shared";
import { STATUS_OPTIONS } from "../helpers";

export default function ProfilePage({ username, go, toast }) {
  const { profile: me } = useAuth();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("sobre");

  const [friendIds, setFriendIds] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentReqs, setSentReqs] = useState([]);
  const [receivedReqs, setReceivedReqs] = useState([]);
  const [myBlocks, setMyBlocks] = useState([]);

  const [userCommunities, setUserCommunities] = useState([]);
  const [testimonialCount, setTestimonialCount] = useState(0);
  const [scrapCount, setScrapCount] = useState(0);
  const [visitors, setVisitors] = useState([]);

  const [showReport, setShowReport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSelf = me?.username === username;

  const load = useCallback(async () => {
    if (!me?.id) return;

    setLoading(true);

    try {
      const u = isSelf
        ? me
        : await api.getProfileByUsername(username);

      setUser(u);

      if (!u) return;

      const [
        fIds,
        sent,
        received,
        blocks,
        testimonials,
        scraps,
      ] = await Promise.all([
        api.getFriendIds(u.id),
        api.getSentRequests(me.id),
        api.getReceivedRequests(me.id),
        api.getMyBlocks(me.id),
        api.getTestimonials(u.id),
        api.getScraps(u.id),
      ]);

      setFriendIds(fIds);
      setSentReqs(sent);
      setReceivedReqs(received);
      setMyBlocks(blocks);

      setTestimonialCount(
        testimonials.filter((t) => t.approved).length
      );

      setScrapCount(scraps.length);

      const friendMap = await api.getProfilesByIds(fIds);
      setFriends(
        fIds
          .map((id) => friendMap[id])
          .filter(Boolean)
      );

      if (!isSelf) {
        await api.logVisit(u.id, me.id);
      }

      if (isSelf) {
        try {
          const rows = await api.getVisitors(u.id);

          const visitorIds = [
            ...new Set(rows.map((r) => r.visitor_id)),
          ].slice(0, 9);

          const visitorMap =
            await api.getProfilesByIds(visitorIds);

          setVisitors(
            visitorIds
              .map((id) => visitorMap[id])
              .filter(Boolean)
          );
        } catch {
          setVisitors([]);
        }
      }
    } catch (e) {
      toast(
        "Erro ao carregar perfil: " + e.message,
        "err"
      );
    } finally {
      setLoading(false);
    }
  }, [username, me?.id, isSelf]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const { supabase } =
          await import("../supabaseClient");

        const { data } = await supabase
          .from("community_members")
          .select(
            "community_id, communities(*)"
          )
          .eq("user_id", user.id);

        setUserCommunities(
          (data || [])
            .map((row) => row.communities)
            .filter(Boolean)
        );
      } catch {
        setUserCommunities([]);
      }
    })();
  }, [user?.id]);

  if (loading && !user) {
    return (
      <div className="ork-classic-loading">
        carregando perfil...
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon="🚫"
        text="Este perfil não existe."
      />
    );
  }

  const isBlockedByMe = myBlocks.some(
    (b) => b.blocked_id === user.id
  );

  const relationshipStatus = isSelf
    ? "self"
    : isBlockedByMe
    ? "blockedByMe"
    : friendIds.includes(me.id)
    ? "friends"
    : sentReqs.some(
        (r) => r.to_user === user.id
      )
    ? "sent"
    : receivedReqs.some(
        (r) => r.from_user === user.id
      )
    ? "received"
    : "none";

  const photoCount =
    (user.avatar_url ? 1 : 0) +
    (user.cover_url ? 1 : 0);

  return (
    <>
      <div className="ork-classic-profile-page">
        <div className="ork-classic-profile-grid">
          {/* COLUNA ESQUERDA */}
          <aside className="ork-classic-profile-left">
            <ProfileCard
              user={user}
              isSelf={isSelf}
              go={go}
              setTab={setTab}
              scrapCount={scrapCount}
              testimonialCount={testimonialCount}
              photoCount={photoCount}
              onEdit={() => setEditing(true)}
            />

            <ProfileActions
              me={me}
              user={user}
              isSelf={isSelf}
              status={relationshipStatus}
              onReport={() =>
                setShowReport(true)
              }
              onEdit={() => setEditing(true)}
              onChanged={load}
              toast={toast}
            />

            <div className="ork-classic-sidebox">
              <div className="ork-classic-sidebox-title">
                Apps
              </div>

              <button type="button">
                🎨 BuddyPoke!
              </button>

              <button type="button">
                👥 Mosaico de amigos
              </button>

              <button type="button">
                ⭐ Sorte do dia
              </button>

              <button type="button">
                🎁 Colheita Feliz
              </button>

              <button type="button">
                mais apps »
              </button>
            </div>
          </aside>

          {/* CENTRO */}
          <main className="ork-classic-profile-main">
            <ProfileHeader
              user={user}
              isSelf={isSelf}
              friendCount={friendIds.length}
              communityCount={
                userCommunities.length
              }
              photoCount={photoCount}
              scrapCount={scrapCount}
              testimonialCount={
                testimonialCount
              }
              tab={tab}
              setTab={setTab}
              onEdit={() => setEditing(true)}
            />

            {tab === "sobre" && (
              <SobreTab
                user={user}
                isSelf={isSelf}
                visitors={visitors}
              />
            )}

            {tab === "recados" && (
              <ScrapsTab
                profileId={user.id}
                isSelf={isSelf}
                meId={me.id}
                toast={toast}
                go={go}
                onChanged={() => {
                  load();
                }}
              />
            )}

            {tab === "depoimentos" && (
              <TestimonialsTab
                profileId={user.id}
                isSelf={isSelf}
                meId={me.id}
                toast={toast}
                go={go}
                onChanged={load}
              />
            )}

            {tab === "fotos" && (
              <PhotosTab
                user={user}
                isSelf={isSelf}
              />
            )}

            {tab === "videos" && (
              <VideosTab />
            )}

            {tab === "comunidades" && (
              <CommunitiesTab
                communities={
                  userCommunities
                }
                go={go}
              />
            )}

            {tab === "amigos" && (
              <FriendsTab
                friends={friends}
                go={go}
              />
            )}

            {tab === "atualizacoes" && (
              <UpdatesTab user={user} />
            )}
          </main>

          {/* COLUNA DIREITA */}
          <aside className="ork-classic-profile-right">
            <FriendsPreview
              friends={friends}
              total={friendIds.length}
              onSeeAll={() =>
                setTab("amigos")
              }
              go={go}
            />

            <CommunitiesPreview
              communities={
                userCommunities
              }
              onSeeAll={() =>
                setTab("comunidades")
              }
              go={go}
            />

            <FansBox />

            {isSelf && (
              <VisitorsBox
                visitors={visitors}
                go={go}
              />
            )}
          </aside>
        </div>
      </div>

      {showReport && (
        <ReportModal
          targetType="perfil"
          targetLabel={`o perfil de ${user.name}`}
          onClose={() =>
            setShowReport(false)
          }
          onSubmit={(reason, detail) =>
            api
              .addReport({
                reporterId: me.id,
                targetType: "perfil",
                targetId: user.id,
                targetLabel: user.name,
                reason,
                detail,
              })
              .then(() =>
                toast(
                  "Denúncia enviada. Nossa equipe vai analisar."
                )
              )
          }
        />
      )}

      {editing && (
        <EditProfileModal
          onClose={() =>
            setEditing(false)
          }
          toast={toast}
        />
      )}
    </>
  );
}

/* =========================================================
   CARD ESQUERDO
========================================================= */

function ProfileCard({
  user,
  isSelf,
  setTab,
  scrapCount,
  testimonialCount,
  photoCount,
  onEdit,
}) {
  return (
    <div className="ork-classic-user-card">
      <div className="ork-classic-user-photo">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
          />
        ) : (
          <div className="ork-classic-user-photo-placeholder">
            {user.name?.[0] || "?"}
          </div>
        )}
      </div>

      <div className="ork-classic-user-name">
        {user.name}
      </div>

      {user.is_admin && (
        <div className="ork-classic-admin">
          👑 admin
        </div>
      )}

      {user.bio && (
        <div className="ork-classic-user-mini-bio">
          {user.bio}
        </div>
      )}

      <div className="ork-classic-user-location">
        {user.relacionamento && (
          <div>
            {user.relacionamento}
          </div>
        )}

        {user.city && (
          <div>
            {user.city}
            {user.state
              ? `, ${user.state}`
              : ""}
          </div>
        )}

        {user.country && (
          <div>{user.country}</div>
        )}
      </div>

      <div className="ork-classic-divider" />

      <nav className="ork-classic-profile-menu">
        {isSelf && (
          <button
            type="button"
            onClick={onEdit}
          >
            📝 editar perfil
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setTab("sobre")
          }
        >
          👤 perfil
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("recados")
          }
        >
          📝 recados ({scrapCount})
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("fotos")
          }
        >
          📷 fotos ({photoCount})
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("videos")
          }
        >
          🎬 vídeos (0)
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("depoimentos")
          }
        >
          💬 depoimentos (
          {testimonialCount})
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("atualizacoes")
          }
        >
          📰 atualizações
        </button>

        <button type="button">
          📅 eventos
        </button>
      </nav>
    </div>
  );
}

/* =========================================================
   CABEÇALHO CENTRAL
========================================================= */

function ProfileHeader({
  user,
  isSelf,
  friendCount,
  communityCount,
  photoCount,
  scrapCount,
  testimonialCount,
  tab,
  setTab,
  onEdit,
}) {
  const status =
    STATUS_OPTIONS.find((s) => s.v === user.status)?.label || "";

  /* PERFIL DE OUTRA PESSOA — ORKUT CLÁSSICO */
  if (!isSelf) {
    return (
      <section className="ork-classic-profile-header ork-visitor-header">
        <div className="ork-visitor-name-row">
          <h1>
            {user.name}
            {user.is_admin && (
              <span className="ork-classic-admin-badge">
                👑 admin
              </span>
            )}
          </h1>
        </div>

        {user.bio && (
          <div className="ork-visitor-bio">
            {user.bio}
          </div>
        )}

        <div className="ork-visitor-stats">
          <VisitorStat
            number={scrapCount}
            label="recados"
            icon="📝"
            onClick={() => setTab("recados")}
          />

          <VisitorStat
            number={photoCount}
            label="fotos"
            icon="📷"
            onClick={() => setTab("fotos")}
          />

          <VisitorStat
            number={0}
            label="vídeos"
            icon="🎬"
            onClick={() => setTab("videos")}
          />

          <VisitorStat
            number={0}
            label="fãs"
            icon="⭐"
          />

          <VisitorRating label="confiável" type="trust" />
          <VisitorRating label="legal" type="cool" />
          <VisitorRating label="sexy" type="sexy" />
        </div>

        <div className="ork-visitor-section-tab">
          <button
            type="button"
            className={tab === "sobre" ? "active" : ""}
            onClick={() => setTab("sobre")}
          >
            social
          </button>
        </div>
      </section>
    );
  }

  /* MEU PRÓPRIO PERFIL */
  const tabs = [
    ["sobre", "Sobre"],
    ["recados", "Recados"],
    ["fotos", "Fotos"],
    ["videos", "Vídeos"],
    ["depoimentos", "Depoimentos"],
    ["amigos", "Amigos"],
    ["comunidades", "Comunidades"],
  ];

  return (
    <section className="ork-classic-profile-header">
      <div className="ork-classic-profile-title-row">
        <div>
          <h1>
            {user.name}

            {user.is_admin && (
              <span className="ork-classic-admin-badge">
                👑 admin
              </span>
            )}
          </h1>

          {user.bio && (
            <div className="ork-classic-profile-message">
              {user.bio}
            </div>
          )}

          {status && (
            <div className="ork-classic-online-status">
              {status}
            </div>
          )}
        </div>

        <button
          className="ork-classic-edit-button"
          onClick={onEdit}
        >
          ✏️ editar perfil
        </button>
      </div>

      <div className="ork-classic-counter-row">
        <Counter number={scrapCount} label="recados" />
        <Counter number={friendCount} label="amigos" />
        <Counter number={photoCount} label="fotos" />
        <Counter number={0} label="vídeos" />
        <Counter number={testimonialCount} label="depoimentos" />
        <Counter number={communityCount} label="comunidades" />
      </div>

      <div className="ork-classic-profile-tabs">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function VisitorStat({ number, label, icon, onClick }) {
  return (
    <button
      type="button"
      className="ork-visitor-stat"
      onClick={onClick}
    >
      <span className="ork-visitor-stat-label">
        {label}
      </span>

      <span className="ork-visitor-stat-bottom">
        <span>{icon}</span>
        <strong>{number}</strong>
      </span>
    </button>
  );
}

function VisitorRating({ label, type }) {
  return (
    <div className={`ork-visitor-rating ${type}`}>
      <span className="ork-visitor-rating-label">
        {label}
      </span>

      <div className="ork-visitor-rating-icons">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function Counter({ number, label }) {
  return (
    <div className="ork-classic-counter">
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

/* =========================================================
   SOBRE
========================================================= */

function SobreTab({
  user,
  isSelf,
  visitors,
}) {
  const rows = [
    [
      "quem sou eu:",
      user.quem_sou_eu,
    ],
    [
      "interesses:",
      user.interesses,
    ],
    ["filmes:", user.filmes],
    ["música:", user.musica],
    ["livros:", user.livros],
    ["esportes:", user.esportes],
    [
      "relacionamento:",
      user.relacionamento,
    ],
    ["profissão:", user.profissao],
    [
      "aniversário:",
      user.birthdate
        ? new Date(
            user.birthdate +
              "T00:00:00"
          ).toLocaleDateString(
            "pt-BR"
          )
        : null,
    ],
    [
      "local:",
      [
        user.city,
        user.state,
        user.country,
      ]
        .filter(Boolean)
        .join(", "),
    ],
  ].filter(([, value]) => value);

  return (
    <>
      <section className="ork-classic-box">
        <div className="ork-classic-box-title">
          👤 Sobre
        </div>

        <div className="ork-classic-about-table">
          {rows.length === 0 && (
            <div className="ork-classic-empty-small">
              Este usuário ainda não
              preencheu suas informações.
            </div>
          )}

          {rows.map(
            ([label, value], i) => (
              <div
                className="ork-classic-about-row"
                key={label}
              >
                <div className="ork-classic-about-label">
                  {label}
                </div>

                <div className="ork-classic-about-value">
                  {value}
                </div>
              </div>
            )
          )}
        </div>

        {isSelf && (
          <div className="ork-classic-visitors-inline">
            <strong>
              Quem visitou meu perfil:
            </strong>

            {visitors.length === 0 ? (
              <span>Ninguém ainda.</span>
            ) : (
              <div className="ork-classic-inline-avatars">
                {visitors
                  .slice(0, 8)
                  .map((v) => (
                    <Avatar
                      key={v.id}
                      profile={v}
                      size={32}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="ork-classic-box">
        <div className="ork-classic-box-title">
          📷 fotos recentes
        </div>

        <div className="ork-classic-placeholder-area">
          <div className="ork-classic-big-icon">
            📷
          </div>

          <div>
            Nenhuma fotografia foi
            adicionada ao álbum ainda.
          </div>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   RECADOS
========================================================= */

function ScrapsTab({
  profileId,
  isSelf,
  meId,
  toast,
  go,
  onChanged,
}) {
  const [scraps, setScraps] =
    useState([]);
  const [authors, setAuthors] =
    useState({});
  const [text, setText] =
    useState("");

  const load = useCallback(
    async () => {
      try {
        const rows =
          await api.getScraps(
            profileId
          );

        setScraps(rows);

        const ids = [
          ...new Set(
            rows.map(
              (r) => r.author_id
            )
          ),
        ];

        setAuthors(
          await api.getProfilesByIds(
            ids
          )
        );
      } catch (e) {
        toast(
          "Erro ao carregar recados: " +
            e.message,
          "err"
        );
      }
    },
    [profileId, toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      await api.addScrap(
        profileId,
        meId,
        text.trim()
      );

      setText("");

      toast(
        "Recado publicado!"
      );

      await load();

      onChanged?.();
    } catch (err) {
      toast(
        "Não foi possível publicar: " +
          err.message,
        "err"
      );
    }
  }

  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        📝 página de recados
      </div>

      {meId !== profileId && (
        <form
          className="ork-classic-scrap-form"
          onSubmit={submit}
        >
          <textarea
            rows="4"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="escreva seu recado..."
          />

          <button type="submit">
            enviar recado
          </button>
        </form>
      )}

      {scraps.length === 0 ? (
        <div className="ork-classic-placeholder-area">
          Nenhum recado ainda.
        </div>
      ) : (
        <div className="ork-classic-scraps">
          {scraps.map((scrap) => {
            const author =
              authors[
                scrap.author_id
              ];

            const canDelete =
              isSelf ||
              scrap.author_id ===
                meId;

            return (
              <article
                className="ork-classic-scrap"
                key={scrap.id}
              >
                <div className="ork-classic-scrap-avatar">
                  <Avatar
                    profile={author}
                    size={55}
                  />
                </div>

                <div className="ork-classic-scrap-content">
                  <button
                    type="button"
                    className="ork-classic-user-link"
                    onClick={() =>
                      author?.username &&
                      go("profile", {
                        username:
                          author.username,
                      })
                    }
                  >
                    {author?.name ||
                      "usuário"}
                  </button>

                  <div className="ork-classic-scrap-text">
                    {scrap.text}
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      className="ork-classic-text-link"
                      onClick={async () => {
                        await api.deleteScrap(
                          scrap.id
                        );

                        await load();
                        onChanged?.();
                      }}
                    >
                      excluir
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   DEPOIMENTOS
========================================================= */

function TestimonialsTab({
  profileId,
  isSelf,
  meId,
  toast,
  go,
  onChanged,
}) {
  const [items, setItems] =
    useState([]);
  const [authors, setAuthors] =
    useState({});
  const [text, setText] =
    useState("");

  const load = useCallback(
    async () => {
      try {
        const rows = (
          await api.getTestimonials(
            profileId
          )
        ).filter(
          (t) =>
            t.approved ||
            isSelf ||
            t.author_id === meId
        );

        setItems(rows);

        const ids = [
          ...new Set(
            rows.map(
              (r) => r.author_id
            )
          ),
        ];

        setAuthors(
          await api.getProfilesByIds(
            ids
          )
        );
      } catch (e) {
        toast(
          "Erro ao carregar depoimentos: " +
            e.message,
          "err"
        );
      }
    },
    [
      profileId,
      isSelf,
      meId,
      toast,
    ]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();

    if (!text.trim()) return;

    try {
      await api.writeTestimonial(
        profileId,
        meId,
        text.trim()
      );

      setText("");

      toast(
        "Depoimento enviado para aprovação!"
      );

      await load();
      onChanged?.();
    } catch (e) {
      toast(
        "Erro ao enviar depoimento: " +
          e.message,
        "err"
      );
    }
  }

  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        💬 depoimentos
      </div>

      {meId !== profileId && (
        <form
          className="ork-classic-scrap-form"
          onSubmit={submit}
        >
          <textarea
            rows="4"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="escreva um depoimento..."
          />

          <button type="submit">
            enviar depoimento
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="ork-classic-placeholder-area">
          Nenhum depoimento ainda.
        </div>
      ) : (
        <div className="ork-classic-scraps">
          {items.map((item) => {
            const author =
              authors[
                item.author_id
              ];

            return (
              <article
                className="ork-classic-scrap"
                key={item.id}
              >
                <Avatar
                  profile={author}
                  size={55}
                />

                <div className="ork-classic-scrap-content">
                  <button
                    type="button"
                    className="ork-classic-user-link"
                    onClick={() =>
                      author?.username &&
                      go("profile", {
                        username:
                          author.username,
                      })
                    }
                  >
                    {author?.name ||
                      "usuário"}
                  </button>

                  {!item.approved && (
                    <div className="ork-classic-awaiting">
                      aguardando
                      aprovação
                    </div>
                  )}

                  <div className="ork-classic-scrap-text">
                    {item.text}
                  </div>

                  <div className="ork-classic-item-actions">
                    {isSelf &&
                      !item.approved && (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.approveTestimonial(
                              item.id
                            );

                            toast(
                              "Depoimento aprovado!"
                            );

                            await load();
                            onChanged?.();
                          }}
                        >
                          aprovar
                        </button>
                      )}

                    {(isSelf ||
                      item.author_id ===
                        meId) && (
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteTestimonial(
                            item.id
                          );

                          await load();
                          onChanged?.();
                        }}
                      >
                        excluir
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   FOTOS
========================================================= */

function PhotosTab({
  user,
  isSelf,
}) {
  const photos = [
    user.avatar_url
      ? {
          url: user.avatar_url,
          title:
            "foto do perfil",
        }
      : null,

    user.cover_url
      ? {
          url: user.cover_url,
          title: "capa",
        }
      : null,
  ].filter(Boolean);

  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        📷 fotografias
      </div>

      {photos.length === 0 ? (
        <div className="ork-classic-placeholder-area">
          <div className="ork-classic-big-icon">
            📷
          </div>

          <div>
            Este usuário ainda não
            possui fotos.
          </div>
        </div>
      ) : (
        <div className="ork-classic-photo-grid">
          {photos.map(
            (photo, index) => (
              <div
                className="ork-classic-photo-card"
                key={index}
              >
                <img
                  src={photo.url}
                  alt=""
                />

                <div>
                  {photo.title}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {isSelf && (
        <div className="ork-classic-info-note">
          Em seguida vamos ativar
          os álbuns completos do
          Orkut.
        </div>
      )}
    </section>
  );
}

/* =========================================================
   VÍDEOS
========================================================= */

function VideosTab() {
  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        🎬 vídeos
      </div>

      <div className="ork-classic-placeholder-area">
        <div className="ork-classic-big-icon">
          🎬
        </div>

        <div>
          Nenhum vídeo adicionado.
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   COMUNIDADES
========================================================= */

function CommunitiesTab({
  communities,
  go,
}) {
  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        👥 comunidades
      </div>

      {communities.length === 0 ? (
        <div className="ork-classic-placeholder-area">
          Nenhuma comunidade ainda.
        </div>
      ) : (
        <div className="ork-classic-community-grid">
          {communities.map((c) => (
            <button
              type="button"
              className="ork-classic-community-item"
              key={c.id}
              onClick={() =>
                go("community", {
                  slug: c.slug,
                })
              }
            >
              <div className="ork-classic-community-photo">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt=""
                  />
                ) : (
                  c.name?.[0] || "?"
                )}
              </div>

              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   AMIGOS
========================================================= */

function FriendsTab({
  friends,
  go,
}) {
  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        👥 amigos
      </div>

      {friends.length === 0 ? (
        <div className="ork-classic-placeholder-area">
          Nenhum amigo ainda.
        </div>
      ) : (
        <div className="ork-classic-full-friends-grid">
          {friends.map((friend) => (
            <button
              type="button"
              className="ork-classic-friend-large"
              key={friend.id}
              onClick={() =>
                go("profile", {
                  username:
                    friend.username,
                })
              }
            >
              <Avatar
                profile={friend}
                size={72}
              />

              <span>
                {friend.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   ATUALIZAÇÕES
========================================================= */

function UpdatesTab({ user }) {
  return (
    <section className="ork-classic-box">
      <div className="ork-classic-box-title">
        📰 atualizações de{" "}
        {user.name}
      </div>

      <div className="ork-classic-placeholder-area">
        Ainda não há atualizações
        para mostrar.
      </div>
    </section>
  );
}

/* =========================================================
   DIREITA — AMIGOS
========================================================= */

function FriendsPreview({
  friends,
  total,
  onSeeAll,
  go,
}) {
  return (
    <section className="ork-classic-right-box">
      <div className="ork-classic-right-title">
        <strong>
          👥 meus amigos ({total})
        </strong>

        <button
          type="button"
          onClick={onSeeAll}
        >
          ver todos »
        </button>
      </div>

      {friends.length === 0 ? (
        <div className="ork-classic-right-empty">
          Nenhum amigo ainda.
        </div>
      ) : (
        <div className="ork-classic-mini-grid">
          {friends
            .slice(0, 9)
            .map((friend) => (
              <button
                type="button"
                key={friend.id}
                onClick={() =>
                  go("profile", {
                    username:
                      friend.username,
                  })
                }
              >
                <Avatar
                  profile={friend}
                  size={58}
                />

                <span>
                  {friend.name}
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   DIREITA — COMUNIDADES
========================================================= */

function CommunitiesPreview({
  communities,
  onSeeAll,
  go,
}) {
  return (
    <section className="ork-classic-right-box">
      <div className="ork-classic-right-title">
        <strong>
          👥 minhas comunidades (
          {communities.length})
        </strong>

        <button
          type="button"
          onClick={onSeeAll}
        >
          ver todas »
        </button>
      </div>

      {communities.length === 0 ? (
        <div className="ork-classic-right-empty ork-classic-pink-empty">
          <div className="ork-classic-big-icon">
            👥
          </div>

          <div>
            Você ainda não participa
            de comunidades.
          </div>
        </div>
      ) : (
        <div className="ork-classic-mini-grid">
          {communities
            .slice(0, 6)
            .map((community) => (
              <button
                type="button"
                key={community.id}
                onClick={() =>
                  go("community", {
                    slug:
                      community.slug,
                  })
                }
              >
                <div className="ork-classic-mini-community">
                  {community.image_url ? (
                    <img
                      src={
                        community.image_url
                      }
                      alt=""
                    />
                  ) : (
                    community.name?.[0] ||
                    "?"
                  )}
                </div>

                <span>
                  {community.name}
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   DIREITA — FÃS
========================================================= */

function FansBox() {
  return (
    <section className="ork-classic-right-box">
      <div className="ork-classic-right-title">
        <strong>
          ⭐ meus fãs (0)
        </strong>

        <button type="button">
          ver todos »
        </button>
      </div>

      <div className="ork-classic-right-empty ork-classic-pink-empty">
        <div className="ork-classic-big-icon">
          ⭐
        </div>

        <div>
          Este usuário ainda não tem
          fãs.
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   DIREITA — VISITANTES
========================================================= */

function VisitorsBox({
  visitors,
  go,
}) {
  return (
    <section className="ork-classic-right-box">
      <div className="ork-classic-right-title">
        <strong>
          👀 visitantes recentes
        </strong>
      </div>

      {visitors.length === 0 ? (
        <div className="ork-classic-right-empty">
          Ninguém ainda.
        </div>
      ) : (
        <div className="ork-classic-mini-grid">
          {visitors
            .slice(0, 6)
            .map((visitor) => (
              <button
                type="button"
                key={visitor.id}
                onClick={() =>
                  go("profile", {
                    username:
                      visitor.username,
                  })
                }
              >
                <Avatar
                  profile={visitor}
                  size={54}
                />

                <span>
                  {visitor.name}
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   AÇÕES
========================================================= */

function ProfileActions({
  me,
  user,
  isSelf,
  status,
  onReport,
  onEdit,
  onChanged,
  toast,
}) {
  const [showScrapBox, setShowScrapBox] =
    useState(false);

  const [
    showTestimonialBox,
    setShowTestimonialBox,
  ] = useState(false);

  const [scrapText, setScrapText] =
    useState("");

  const [
    testimonialText,
    setTestimonialText,
  ] = useState("");

  if (isSelf) {
    return null;
  }

  async function act(fn) {
    try {
      await fn();
      await onChanged();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  return (
    <div className="ork-classic-actions-box">
      {status === "none" && (
        <button
          type="button"
          onClick={() =>
            act(() =>
              api
                .sendFriendRequest(
                  me.id,
                  user.id
                )
                .then(() =>
                  toast(
                    "Solicitação enviada!"
                  )
                )
            )
          }
        >
          👥 adicionar como amigo
        </button>
      )}

      {status === "sent" && (
        <button
          type="button"
          onClick={() =>
            act(async () => {
              const reqs =
                await api.getSentRequests(
                  me.id
                );

              const req = reqs.find(
                (r) =>
                  r.to_user === user.id
              );

              if (req) {
                await api.cancelFriendRequest(
                  req.id
                );
              }
            })
          }
        >
          cancelar solicitação
        </button>
      )}

      {status === "received" && (
        <>
          <button
            type="button"
            onClick={() =>
              act(async () => {
                const reqs =
                  await api.getReceivedRequests(
                    me.id
                  );

                const req =
                  reqs.find(
                    (r) =>
                      r.from_user ===
                      user.id
                  );

                if (req) {
                  await api.respondFriendRequest(
                    req.id,
                    true
                  );

                  toast(
                    "Vocês agora são amigos!"
                  );
                }
              })
            }
          >
            ✅ aceitar amizade
          </button>

          <button
            type="button"
            onClick={() =>
              act(async () => {
                const reqs =
                  await api.getReceivedRequests(
                    me.id
                  );

                const req =
                  reqs.find(
                    (r) =>
                      r.from_user ===
                      user.id
                  );

                if (req) {
                  await api.respondFriendRequest(
                    req.id,
                    false
                  );
                }
              })
            }
          >
            ❌ recusar
          </button>
        </>
      )}

      {status === "friends" && (
        <button
          type="button"
          onClick={() =>
            act(() =>
              api
                .removeFriendship(
                  me.id,
                  user.id
                )
                .then(() =>
                  toast(
                    "Amizade desfeita."
                  )
                )
            )
          }
        >
          👥 remover amigo
        </button>
      )}

      {status !== "blockedByMe" && (
        <>
          <button
            type="button"
            onClick={() =>
              setShowScrapBox(
                (v) => !v
              )
            }
          >
            📝 escrever recado
          </button>

          <button
            type="button"
            onClick={() =>
              setShowTestimonialBox(
                (v) => !v
              )
            }
          >
            💬 criar depoimento
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() =>
          act(() =>
            status === "blockedByMe"
              ? api
                  .unblockUser(
                    me.id,
                    user.id
                  )
                  .then(() =>
                    toast(
                      "Usuário desbloqueado."
                    )
                  )
              : api
                  .blockUser(
                    me.id,
                    user.id
                  )
                  .then(() =>
                    toast(
                      "Usuário bloqueado."
                    )
                  )
          )
        }
      >
        {status === "blockedByMe"
          ? "🔓 desbloquear"
          : "🚫 bloquear"}
      </button>

      <button
        type="button"
        onClick={onReport}
      >
        ⚠ denunciar abuso
      </button>

      {showScrapBox && (
        <form
          className="ork-classic-action-form"
          onSubmit={(e) => {
            e.preventDefault();

            if (!scrapText.trim())
              return;

            act(() =>
              api
                .addScrap(
                  user.id,
                  me.id,
                  scrapText.trim()
                )
                .then(() =>
                  toast(
                    "Recado publicado!"
                  )
                )
            );

            setScrapText("");
            setShowScrapBox(false);
          }}
        >
          <textarea
            value={scrapText}
            onChange={(e) =>
              setScrapText(
                e.target.value
              )
            }
          />

          <button>
            enviar
          </button>
        </form>
      )}

      {showTestimonialBox && (
        <form
          className="ork-classic-action-form"
          onSubmit={(e) => {
            e.preventDefault();

            if (
              !testimonialText.trim()
            )
              return;

            act(() =>
              api
                .writeTestimonial(
                  user.id,
                  me.id,
                  testimonialText.trim()
                )
                .then(() =>
                  toast(
                    "Depoimento enviado para aprovação!"
                  )
                )
            );

            setTestimonialText("");
            setShowTestimonialBox(false);
          }}
        >
          <textarea
            value={testimonialText}
            onChange={(e) =>
              setTestimonialText(
                e.target.value
              )
            }
          />

          <button>
            enviar
          </button>
        </form>
      )}
    </div>
  );
}

/* =========================================================
   EDITAR PERFIL
========================================================= */

function EditProfileModal({
  onClose,
  toast,
}) {
  const {
    profile: user,
    updateMyProfile,
  } = useAuth();

  const [form, setForm] = useState({
    ...user,
  });

  const [avatarFile, setAvatarFile] =
    useState(null);

  const [coverFile, setCoverFile] =
    useState(null);

  const [avatarPreview, setAvatarPreview] =
    useState(user.avatar_url);

  const [coverPreview, setCoverPreview] =
    useState(user.cover_url);

  const [saving, setSaving] =
    useState(false);

  function set(key, value) {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  }

  function onAvatar(e) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setAvatarFile(file);

    setAvatarPreview(
      URL.createObjectURL(file)
    );
  }

  function onCover(e) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setCoverFile(file);

    setCoverPreview(
      URL.createObjectURL(file)
    );
  }

  async function save(e) {
    e.preventDefault();

    setSaving(true);

    try {
      const patch = {
        ...form,
      };

      delete patch.id;
      delete patch.email;
      delete patch.created_at;
      delete patch.updated_at;
      delete patch.is_admin;
      delete patch.is_suspended;
      delete patch.username;

      if (avatarFile) {
        patch.avatar_url =
          await api.uploadImage(
            "avatars",
            user.id,
            avatarFile,
            400
          );
      }

      if (coverFile) {
        patch.cover_url =
          await api.uploadImage(
            "covers",
            user.id,
            coverFile,
            1000
          );
      }

      await updateMyProfile(patch);

      toast(
        "Perfil atualizado!"
      );

      onClose();
    } catch (err) {
      toast(
        "Erro ao salvar: " +
          err.message,
        "err"
      );
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    ["bio", "Frase / status"],
    ["city", "Cidade"],
    ["state", "Estado"],
    ["country", "País"],
    [
      "relacionamento",
      "Relacionamento",
    ],
    ["profissao", "Profissão"],
    ["interesses", "Interesses"],
    ["filmes", "Filmes"],
    ["musica", "Música"],
    ["livros", "Livros"],
    ["esportes", "Esportes"],
  ];

  return (
    <div
      className="ork-modal-bg"
      onClick={onClose}
    >
      <div
        className="ork-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <h3>
          editar perfil
        </h3>

        <form onSubmit={save}>
          <div className="ork-classic-edit-images">
            <div>
              <div className="ork-classic-edit-avatar">
                {avatarPreview && (
                  <img
                    src={
                      avatarPreview
                    }
                    alt=""
                  />
                )}
              </div>

              <label>
                alterar foto
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={
                    onAvatar
                  }
                />
              </label>
            </div>

            <div>
              <div className="ork-classic-edit-cover">
                {coverPreview && (
                  <img
                    src={
                      coverPreview
                    }
                    alt=""
                  />
                )}
              </div>

              <label>
                alterar capa
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={
                    onCover
                  }
                />
              </label>
            </div>
          </div>

          <div className="ork-field">
            <label>
              Status
            </label>

            <select
              value={
                form.status || ""
              }
              onChange={(e) =>
                set(
                  "status",
                  e.target.value
                )
              }
            >
              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status.v}
                    value={status.v}
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>
          </div>

          {fields.map(
            ([key, label]) => (
              <div
                className="ork-field"
                key={key}
              >
                <label>
                  {label}
                </label>

                <input
                  value={
                    form[key] || ""
                  }
                  onChange={(e) =>
                    set(
                      key,
                      e.target.value
                    )
                  }
                />
              </div>
            )
          )}

          <div className="ork-field">
            <label>
              Quem sou eu
            </label>

            <textarea
              rows="5"
              value={
                form.quem_sou_eu ||
                ""
              }
              onChange={(e) =>
                set(
                  "quem_sou_eu",
                  e.target.value
                )
              }
            />
          </div>

          <div className="ork-classic-modal-buttons">
            <button
              type="button"
              className="ork-btn ork-btn-ghost"
              onClick={onClose}
            >
              cancelar
            </button>

            <button
              className="ork-btn ork-btn-primary"
              disabled={saving}
            >
              {saving
                ? "salvando..."
                : "salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
