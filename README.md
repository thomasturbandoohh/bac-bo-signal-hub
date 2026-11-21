# Bac Bo Live — Robô de Sinais (lord-m)

Aplicação web em TanStack Start (React 19, Vite, Tailwind v4) com backend Lovable Cloud (Postgres + Auth + Storage).
Lê rodadas reais da mesa Bac Bo Live e mostra sinais a utilizadores aprovados.

## Estrutura
- `src/routes/index.tsx` — redireciona para `/robos` ou `/auth`.
- `src/routes/auth.tsx` — login/cadastro (e-mail e Google).
- `src/routes/_authenticated/` — exige sessão; `_approved/` exige conta aprovada:
  `robos`, `perfil`, `admin` (só administradores; o servidor e o RLS também verificam).
- A rota antiga `/historico` redireciona para `/robos`; não existe mais opção Histórico na navegação.
- `src/lib/` — motor de sinais, agenda do robô, funções de servidor (`*.functions.ts`), código só de servidor (`*.server.ts`) e regras puras de acesso (`access-rules.ts`).
- `drizzle/migrations/` — histórico do esquema da base (gerido pelo Lovable; não editar migrações antigas).

## Requisitos e comandos (Bun)
```bash
bun install --frozen-lockfile
bun run dev        # servidor local
bun run lint
bun run typecheck  # tsc --noEmit
bun run test       # vitest
bun run build
```
O CI (`.github/workflows/ci.yml`) corre estes passos em cada push e pull request.

## Configuração
Copie `.env.example` para `.env` e preencha. O `.env` versionado contém apenas configuração pública do backend (as builds publicadas só incluem ficheiros do repositório).
- Públicas (browser): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`.
- **Só servidor (segredos):** `SUPABASE_SERVICE_ROLE_KEY` / `DB_SERVICE_ROLE_KEY`, `LYNXMETRICS_API_KEY`. Nunca usar prefixo `VITE_`, nunca importar no browser, nunca escrever em logs ou documentação.

## Publicação
No Lovable: botão Publish. Em hosting próprio (Vercel/Netlify), definir as variáveis acima no painel do hosting; os segredos só como variáveis de servidor.

## Contas e administradores
Todo o cadastro novo começa `pending` com a role `user`. Não há administrador automático por e-mail.
Primeiro administrador (depois de a conta existir e estar confirmada), no editor SQL do backend, substituindo `<UUID>` pelo id da conta:
```sql
begin;
insert into public.user_roles (user_id, role) values ('<UUID>', 'admin') on conflict (user_id, role) do nothing;
-- o trigger protect_profile_fields exige um admin como autor da mudança de estado
select set_config('request.jwt.claims', json_build_object('sub', '<UUID>', 'role', 'authenticated')::text, true);
update public.profiles set status = 'approved' where id = '<UUID>';
commit;
```
Depois disso, outros utilizadores são aprovados/bloqueados no Painel Admin.

## Verificar permissões sem expor dados pessoais
```sql
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 2;
select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
select status, count(*) from public.profiles group by status;
select role, count(*) from public.user_roles group by role;
```
A pausa da API da mesa é global (`robot_settings.api_paused`): só administradores a alteram (política RLS de update) e, enquanto ativa, nenhum cliente consulta a mesa e o servidor não chama o provedor.

## Estatísticas observadas

- O painel de distribuição resume as frequências observadas nas últimas 20 rodadas recebidas (ou em todas, quando há menos de 20).
- Os percentuais são calculados diretamente a partir das contagens de Player, Banker e Tie; o arredondamento mantém a soma em 100%.
- A visualização não aplica bónus por padrões, não extrapola tendências e identifica os valores como histórico, não como previsão nem como probabilidade da próxima rodada.
- Esta alteração não modifica os critérios, a cadência ou a lógica de geração de sinais.
