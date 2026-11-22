# Roadmap

- [x] Signup no longer grants admin/approval by e-mail (new migration, existing accounts unchanged)
- [x] Global `api_paused` in robot settings (migration, types, provider, admin switch, server skip)
- [x] Query freshness: no background refetch, coherent staleTime; seconds countdown at 1s
- [x] README, .env.example, .gitignore, untrack .env
- [x] typecheck script, CI workflow, small pure auth/validation tests
- [x] Verify lint/typecheck/test/build, signup check, one commit

## Importação do GitHub (lord-m-project-preview) — 21/11
- [x] Código, banco de dados, armazenamento e login copiados para este projeto
- [x] Banco, armazenamento, login por e-mail e Google recriados neste Lovable Cloud
- [x] Liberar admin para kmnxzzzll@gmail.com
- [ ] Chave da LynxMetrics salva no painel do admin (mesa ao vivo)
- [ ] Dados e usuários antigos (aguardando exportação ou "pular")

## Visual + gale (pedido 21/11)
- [x] Card de porcentagens igual à referência, liquid glass, água fraca analisando / sobe no sinal, números gerando
- [x] Liquid glass em ícones/cards, ícones estilo Apple, emojis 3D
- [x] Mesa ao vivo mais realista
- [x] Login: campos dentro de um card, textos em negrito
- [x] 1 gale: notificação "Faça o Gale" e "Green no Gale"
- [x] Barra de análise mais lenta e suave (entrada forçada removida em 21/11 16:13)

## Robô mais rigoroso + ondas (pedido 21/11, 16:13)
- [x] Remover a faixa no rodapé do card Standby/Analisando
- [x] Ondas suaves sem linhas; baixas e sem números ao buscar, sobem no lado do sinal, baixam ao esperar resultado
- [x] Sem entrada forçada; só entra com confluência calculada ≥ 75%
- [x] Ciclo da mesa (tendência x picotada): não entrar em surf com mesa picotada
- [x] Leitura das margens dos 4 dados → chance de empate e proteção reforçada
- [x] Barra de análise com cor/feedback por etapa

## Ajustes (pedido 21/11, 16:38)
- [x] Empate só como proteção (sem cara de entrada no empate); sinais só Player/Banker
- [x] Mandar sinal sempre que um padrão se forma (tirar o mínimo de 75%), sem entrada forçada
- [x] Placar/sinais não resetam ao sair e voltar: contam tudo desde que o robô foi ligado, inclusive enquanto ninguém estava no app
- [x] Corrigir erros do código e deixar a plataforma fluida (sem mudar ícones/efeitos)
- [x] Login: foto nova de cassino com animações (framer-motion)
- [x] Login: voltar para a foto anterior, mantendo as animações
- [x] Robôs: cards organizados em duas colunas no computador (celular continua igual)

## Implantação do repositório bac-bo-signal-hub com Supabase próprio (22/11)
- [x] Código do GitHub copiado para este projeto
- [x] Supabase próprio ligado pelo endereço e chave pública (arquivo .env)
- [x] Chave secreta do servidor salva como DB_SERVICE_ROLE_KEY e testada (armazenamento, configurações, usuários)
- [x] Tela de login abre conectada ao banco
- [x] Dono criou a conta, confirmou o e-mail e virou admin
- [x] Tela clara "Banco de dados ainda não ligado" no lugar da tela em branco enquanto o Supabase não está ligado
- [x] Login explica "confirme seu e-mail" e tem botão para reenviar a confirmação (antes mostrava erro genérico)
- [ ] Chave da LynxMetrics salva no painel do admin (mesa ao vivo) — o dono faz
- [ ] Gravação da mesa com o app fechado (agendamento) — hoje grava só enquanto alguém está com o app aberto

## Pedido 22/11 12:43
- [ ] Robô continua gravando a mesa e mandando sinais com o app fechado (agendamento no Supabase do dono)
- [x] Nova aba Histórico (ícone na barra): sinais do robô com resultado Green / Red / Green G1, bem organizado
- [x] Plataforma mais otimizada (leve e rápida)
- [x] Login: cards normais (sem efeito suave)
- [x] Melhorar proporções no celular
- [x] Cadastro: mensagem clara para o limite de e-mails do Supabase; outros erros mostram a mensagem exata
- [ ] Chave SYNC_JOB_SECRET (formulário interrompido) + comando SQL do agendamento no Supabase

- [x] Login: animação leve de volta (entrada suave do card, sem exagero)
