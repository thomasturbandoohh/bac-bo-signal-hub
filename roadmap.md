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
