import { supabase } from "./supabaseClient";
import { resizeImageToBlob } from "./helpers";

/* ---------------- storage ---------------- */

export async function uploadImage(bucket, userId, file, maxSize = 480) {
  const blob = await resizeImageToBlob(file, maxSize);
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------- profiles / settings ---------------- */

export async function getProfileByUsername(username) {
  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}
export async function getProfileById(id) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function getProfilesByIds(ids) {
  if (!ids.length) return {};
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  const map = {};
  (data || []).forEach((p) => (map[p.id] = p));
  return map;
}
export async function getSettings(userId) {
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  return data;
}
export async function updateProfile(userId, patch) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
export async function updateSettings(userId, patch) {
  const { error } = await supabase.from("user_settings").update(patch).eq("user_id", userId);
  if (error) throw error;
}
export async function isUsernameAvailable(username) {
  const { data, error } = await supabase.rpc("is_username_available", { u: username });
  if (error) throw error;
  return data;
}

/* ---------------- amizades ---------------- */

export async function getFriendIds(userId) {
  const { data, error } = await supabase.from("friendships").select("*").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw error;
  return (data || []).map((r) => (r.user_a === userId ? r.user_b : r.user_a));
}
export async function getReceivedRequests(userId) {
  const { data, error } = await supabase.from("friend_requests").select("*").eq("to_user", userId).eq("status", "pending");
  if (error) throw error;
  return data || [];
}
export async function getSentRequests(userId) {
  const { data, error } = await supabase.from("friend_requests").select("*").eq("from_user", userId).eq("status", "pending");
  if (error) throw error;
  return data || [];
}
export async function sendFriendRequest(fromId, toId) {
  const { error } = await supabase.from("friend_requests").insert({ from_user: fromId, to_user: toId });
  if (error) throw error;
}
export async function cancelFriendRequest(id) {
  const { error } = await supabase.from("friend_requests").delete().eq("id", id);
  if (error) throw error;
}
export async function respondFriendRequest(id, accept) {
  const { error } = accept
    ? await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", id)
    : await supabase.from("friend_requests").delete().eq("id", id);
  if (error) throw error;
}
export async function removeFriendship(meId, otherId) {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(`and(user_a.eq.${meId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${meId})`);
  if (error) throw error;
}

/* ---------------- bloqueios ---------------- */

export async function getMyBlocks(userId) {
  const { data, error } = await supabase.from("blocks").select("*").eq("blocker_id", userId);
  if (error) throw error;
  return data || [];
}
export async function blockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}
export async function unblockUser(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

/* ---------------- posts / feed ---------------- */

export async function createPost({ authorId, text, imageUrl, communityId = null, title = null }) {
  const { error } = await supabase.from("posts").insert({ author_id: authorId, text, image_url: imageUrl, community_id: communityId, title });
  if (error) throw error;
}
export async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
export async function getFeedPosts({ authorIds, communityIds }) {
  const orParts = [];
  if (authorIds.length) orParts.push(`author_id.in.(${authorIds.join(",")})`);
  let query = supabase.from("posts").select("*").is("community_id", null).order("created_at", { ascending: false }).limit(40);
  if (authorIds.length) query = query.in("author_id", authorIds);
  else query = query.eq("author_id", "00000000-0000-0000-0000-000000000000"); // nada
  const { data: ownFeed, error: e1 } = await query;
  if (e1) throw e1;
  let communityPosts = [];
  if (communityIds.length) {
    const { data, error } = await supabase.from("posts").select("*").in("community_id", communityIds).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    communityPosts = data || [];
  }
  const all = [...(ownFeed || []), ...communityPosts];
  all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return all;
}
export async function getCommunityPosts(communityId) {
  const { data, error } = await supabase.from("posts").select("*").eq("community_id", communityId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function getLikes(postIds) {
  if (!postIds.length) return [];
  const { data, error } = await supabase.from("post_likes").select("*").in("post_id", postIds);
  if (error) throw error;
  return data || [];
}
export async function toggleLike(postId, userId, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}
export async function getComments(postIds) {
  if (!postIds.length) return [];
  const { data, error } = await supabase.from("comments").select("*").in("post_id", postIds).order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function addComment(postId, authorId, text) {
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: authorId, text });
  if (error) throw error;
}

/* ---------------- recados ---------------- */

export async function getScraps(profileId) {
  const { data, error } = await supabase.from("scraps").select("*").eq("profile_id", profileId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function addScrap(profileId, authorId, text) {
  const { error } = await supabase.from("scraps").insert({ profile_id: profileId, author_id: authorId, text });
  if (error) throw error;
}
export async function deleteScrap(id) {
  const { error } = await supabase.from("scraps").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- depoimentos ---------------- */

export async function getTestimonials(profileId) {
  const { data, error } = await supabase.from("testimonials").select("*").eq("profile_id", profileId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function writeTestimonial(profileId, authorId, text) {
  const { error } = await supabase.from("testimonials").insert({ profile_id: profileId, author_id: authorId, text });
  if (error) throw error;
}
export async function approveTestimonial(id) {
  const { error } = await supabase.from("testimonials").update({ approved: true }).eq("id", id);
  if (error) throw error;
}
export async function deleteTestimonial(id) {
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- comunidades ---------------- */

export async function listCommunities() {
  const { data, error } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function getCommunityBySlug(slug) {
  const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}
export async function getMyCommunityIds(userId) {
  const { data, error } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((r) => r.community_id);
}
export async function getCommunityMembers(communityId) {
  const { data, error } = await supabase.from("community_members").select("*").eq("community_id", communityId);
  if (error) throw error;
  return data || [];
}
export async function createCommunity({ slug, name, description, category, imageUrl, creatorId }) {
  const { data, error } = await supabase.from("communities").insert({ slug, name, description, category, image_url: imageUrl, creator_id: creatorId }).select().single();
  if (error) throw error;
  const { error: e2 } = await supabase.from("community_members").insert({ community_id: data.id, user_id: creatorId });
  if (e2) throw e2;
  return data;
}
export async function joinCommunity(communityId, userId) {
  const { error } = await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
  if (error) throw error;
}
export async function leaveCommunity(communityId, userId) {
  const { error } = await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
  if (error) throw error;
}
export async function deleteCommunity(id) {
  const { error } = await supabase.from("communities").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- notificações ---------------- */

export async function getNotifications(userId) {
  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(80);
  if (error) throw error;
  return data || [];
}
export async function markNotificationsRead(userId) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
  if (error) throw error;
}

/* ---------------- visitas ---------------- */

export async function logVisit(profileId, visitorId) {
  if (profileId === visitorId) return;
  const { error } = await supabase.from("profile_visits").insert({ profile_id: profileId, visitor_id: visitorId });
  if (error) console.warn("visit log falhou (ok ignorar):", error.message);
}
export async function getVisitors(profileId) {
  const { data, error } = await supabase.from("profile_visits").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return data || [];
}

/* ---------------- denúncias ---------------- */

export async function addReport({ reporterId, targetType, targetId, targetLabel, reason, detail }) {
  const { error } = await supabase.from("reports").insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, target_label: targetLabel, reason, detail });
  if (error) throw error;
}
export async function getReports() {
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function resolveReport(id) {
  const { error } = await supabase.from("reports").update({ resolved: true }).eq("id", id);
  if (error) throw error;
}

/* ---------------- busca ---------------- */

export async function searchPeople(term) {
  const { data, error } = await supabase.from("profiles").select("*").or(`name.ilike.%${term}%,username.ilike.%${term}%`).limit(20);
  if (error) throw error;
  return data || [];
}
export async function searchCommunities(term) {
  const { data, error } = await supabase.from("communities").select("*").ilike("name", `%${term}%`).limit(20);
  if (error) throw error;
  return data || [];
}

/* ---------------- sorte do dia ---------------- */

export async function getDailyQuote() {
  const { count } = await supabase.from("daily_quotes").select("*", { count: "exact", head: true });
  const total = count || 1;
  const dayNum = Math.floor(Date.now() / 86400000);
  const idx = (dayNum % total) + 1; // ids seriais começam em 1
  const { data } = await supabase.from("daily_quotes").select("*").eq("id", idx).maybeSingle();
  return data?.text || "Hoje é um bom dia para reviver boas lembranças.";
}

/* ---------------- admin ---------------- */

export async function adminListUsers() {
  // usa a função admin_list_profiles (SECURITY DEFINER) para poder ver o e-mail
  // de todo mundo — a função só retorna linhas se quem chamou for admin.
  const { data, error } = await supabase.rpc("admin_list_profiles");
  if (error) throw error;
  return (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
export async function adminSetSuspended(userId, val) {
  const { error } = await supabase.from("profiles").update({ is_suspended: val }).eq("id", userId);
  if (error) throw error;
}
export async function adminSetAdmin(userId, val) {
  const { error } = await supabase.from("profiles").update({ is_admin: val }).eq("id", userId);
  if (error) throw error;
}
export async function adminCounts() {
  const [users, communities, posts, reports] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }),
  ]);
  return {
    users: users.count || 0,
    communities: communities.count || 0,
    posts: posts.count || 0,
    reports: reports.count || 0,
  };
}
