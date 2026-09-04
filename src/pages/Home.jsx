import { useEffect, useState, useCallback } from "react";
import * as api from "../api";
import { LuckyCard, PostComposer, PostCard, EmptyState } from "../components/Shared";

export default function HomePage({ me, isAdmin, go, toast }) {
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [likes, setLikes] = useState({}); // postId -> Set(userId)
  const [comments, setComments] = useState({}); // postId -> array
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const friendIds = await api.getFriendIds(me.id);
      const communityIds = await api.getMyCommunityIds(me.id);
      const authorIds = [...new Set([me.id, ...friendIds])];
      const feed = await api.getFeedPosts({ authorIds, communityIds });
      setPosts(feed);

      const allAuthorIds = [...new Set(feed.map((p) => p.author_id))];
      const [profilesMap, likeRows, commentRows] = await Promise.all([
        api.getProfilesByIds(allAuthorIds),
        api.getLikes(feed.map((p) => p.id)),
        api.getComments(feed.map((p) => p.id)),
      ]);
      const commentAuthorIds = [...new Set(commentRows.map((c) => c.author_id))];
      const extraProfiles = await api.getProfilesByIds(commentAuthorIds.filter((id) => !profilesMap[id]));
      setProfiles({ ...profilesMap, ...extraProfiles });

      const likeMap = {};
      likeRows.forEach((l) => { (likeMap[l.post_id] ||= new Set()).add(l.user_id); });
      setLikes(likeMap);
      const commentMap = {};
      commentRows.forEach((c) => { (commentMap[c.post_id] ||= []).push(c); });
      setComments(commentMap);
    } catch (e) {
      toast("Erro ao carregar o feed: " + e.message, "err");
    } finally { setLoading(false); }
  }, [me.id]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [load]);

  async function handleCreatePost({ text, file }) {
    let imageUrl = null;
    if (file) imageUrl = await api.uploadImage("posts", me.id, file, 700);
    await api.createPost({ authorId: me.id, text, imageUrl });
    toast("Post publicado!");
    load();
  }
  async function handleToggleLike(post) {
    const likedNow = likes[post.id]?.has(me.id);
    await api.toggleLike(post.id, me.id, likedNow);
    load();
  }
  async function handleAddComment(post, text) {
    await api.addComment(post.id, me.id, text);
    load();
  }
  async function handleDelete(post) {
    await api.deletePost(post.id);
    toast("Post excluído.");
    load();
  }

  return (
    <>
      <LuckyCard />
      <PostComposer meProfile={me} onSubmit={handleCreatePost} />
      <div className="card">
        <h3>Seu feed</h3>
        {loading ? <div className="hint">Carregando…</div> : posts.length === 0 ? (
          <EmptyState icon="📭" text="Nada por aqui ainda. Publique algo ou adicione amigos para ver posts!" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                author={profiles[p.author_id]}
                meId={me.id}
                isAdmin={isAdmin}
                liked={!!likes[p.id]?.has(me.id)}
                likeCount={likes[p.id]?.size || 0}
                comments={comments[p.id] || []}
                commentAuthors={profiles}
                onToggleLike={handleToggleLike}
                onAddComment={handleAddComment}
                onDelete={handleDelete}
                onOpenProfile={(username) => go("profile", { username })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
