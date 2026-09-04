# Orkut — versão Supabase + Netlify

Site independente do Orkut nostálgico: React (Vite) no front-end, Supabase
para autenticação, banco de dados e imagens. Depois de configurado, roda
sozinho, sem depender do Claude.

## 1. Criar o projeto no Supabase

1. Crie uma conta em https://supabase.com e um novo projeto (grátis).
2. Vá em **Authentication → Providers → Email** e deixe **"Confirm email"
   ativado** (é essa opção que faz o link de confirmação por e-mail
   funcionar, como combinamos).
3. Vá em **SQL Editor** e rode, **nesta ordem**, o conteúdo de:
   - `supabase/schema.sql` (tabelas, índices, triggers, RLS)
   - `supabase/seed.sql` (as 50 frases da Sorte do Dia)
4. Vá em **Storage** e crie 5 buckets **marcados como "Public bucket"**:
   `avatars`, `covers`, `posts`, `communities`, `albums`.
5. Ainda no SQL Editor, rode `supabase/storage-policies.sql` (as regras de
   quem pode subir/editar/excluir imagens em cada bucket).
6. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**

## 2. Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env e cole a URL e a anon key do passo anterior
npm run dev
```

Abra o link que aparecer (normalmente `http://localhost:5173`). Crie sua
conta — como é a primeira, você vira administrador automaticamente (ícone
🛡️ Admin aparece no menu).

## 3. Publicar no Netlify

**Opção A — pelo site do Netlify (mais simples):**
1. Suba esta pasta para um repositório no GitHub.
2. Em https://app.netlify.com → "Add new site" → "Import an existing project".
3. Escolha o repositório. O Netlify já vai detectar o `netlify.toml`
   (build command `npm run build`, pasta `dist`).
4. Em **Site settings → Environment variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em "Deploy site".

**Opção B — pela CLI:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```
(Configure as mesmas variáveis de ambiente pelo dashboard do Netlify antes
de rodar o build, ou exporte-as no terminal antes do `npm run build`.)

## O que já funciona de ponta a ponta

- Cadastro com confirmação por e-mail real, checagem de 18+ (no
  front-end **e** no banco, como segunda camada de proteção)
- Login/logout com sessão persistente (Supabase Auth)
- Primeiro usuário cadastrado vira administrador automaticamente
- Perfil completo (capa, avatar, bio, interesses, status, privacidade)
- Amigos: solicitar, aceitar, recusar, remover — com notificação automática
- Recados e depoimentos (com fluxo de aprovação)
- Feed de posts (com foto), curtidas e comentários
- Comunidades: criar, entrar, sair, feed próprio de posts
- Notificações geradas automaticamente por triggers no banco (curtida,
  comentário, recado, depoimento, aprovação, solicitação de amizade)
- Busca de pessoas e comunidades
- "Quem visitou meu perfil" + Sorte do Dia (50 frases)
- Bloqueio (remove amizade e impede novas solicitações/recados
  automaticamente) e denúncia
- Painel administrativo: métricas, suspender/reativar conta, promover
  admin, moderar denúncias, excluir comunidades

## Decisões de segurança importantes (RLS)

- **E-mails não vazam**: a tabela `profiles` tem um `grant select` por
  coluna que **exclui** o campo `email`. Cada pessoa lê o próprio e-mail
  direto da sessão do Supabase Auth; o admin lê e-mails de todo mundo só
  através de uma função no banco que confere `is_admin()` antes de
  responder.
- **Bloqueios são bilaterais mesmo sob RLS**: como um usuário normalmente
  não enxergaria (por RLS) que alguém o bloqueou, criamos a função
  `is_blocked()` (roda como "dono" da tabela) para isso ser checado
  corretamente nas políticas de solicitação de amizade e recados.
- **Amizade só nasce por trigger**: o cliente nunca insere direto na
  tabela `friendships` — só uma trigger no aceite do pedido de amizade
  cria a linha, o que fecha brechas de alguém forjar uma amizade.
- **Notificações só nascem por trigger**: o cliente nunca insere direto
  em `notifications`, evitando spam/forjamento de notificações.
- Toda regra de "só o dono edita" e "admin pode moderar" está em Row
  Level Security no Postgres — não depende do código do front-end.

## O que ficou simplificado nesta v1 (documentado com transparência)

- **Álbuns de fotos completos**: as tabelas `albums` e `photos` já
  existem no banco, prontas para receber a interface. Por enquanto o app
  só usa foto de perfil e capa.
- **Login só com e-mail/senha**: dá para adicionar "Entrar com Google"
  depois, ativando o provider OAuth do Google no Supabase — é só habilitar
  no dashboard e trocar o formulário de login por
  `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Sem tempo real**: notificações e feed são recarregados ao navegar, não
  em tempo real. Dá para evoluir com o Supabase Realtime depois.

## Estrutura das pastas

```
supabase/          → SQL para rodar no seu projeto Supabase
src/api.js         → todas as chamadas ao banco/Storage
src/context/       → sessão e autenticação
src/pages/         → uma página por tela do app
src/components/    → cabeçalho, navegação e peças de UI reaproveitadas
```
