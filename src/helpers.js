export function calcAge(birthdate) {
  if (!birthdate) return 0;
  const b = new Date(birthdate + "T00:00:00");
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
export function validUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

// Redimensiona uma imagem no navegador e devolve um Blob JPEG pronto para upload.
export function resizeImageToBlob(file, maxSize = 480, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
        } else if (height > maxSize) {
          width = Math.round(width * (maxSize / height)); height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const STATUS_OPTIONS = [
  { v: "online", label: "Online", color: "#3FB65F" },
  { v: "ausente", label: "Ausente", color: "#E8A93B" },
  { v: "ocupado", label: "Ocupado", color: "#E4574C" },
  { v: "invisivel", label: "Invisível", color: "#9A93A8" },
];
export const CATEGORIAS = ["Música","Filmes","Jogos","Tecnologia","Humor","Esportes","Design","Fotografia","Estudos","Viagens","Geral"];
export const REPORT_REASONS = ["Spam","Conteúdo ofensivo","Assédio","Conteúdo impróprio","Falsidade","Outro"];
export const NOTIF_ICON = { friend_request: "👋", friend_accept: "🤝", scrap: "💬", testimonial: "📝", testimonial_approved: "✅", like: "💗", comment: "💭" };
