# Changelog

Todas as mudanças relevantes da G.W.E.N. ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Sincronização entre computadores (opcional)
- Mapeamento de comportamento: foco, programas abertos e áudio, por categoria
- Widget flutuante "sempre no topo"

## [0.4.0] - 2026-10-17

### Alterado
- **Dados locais:** tudo fica num banco SQLite no computador, sem conta e sem internet ([`ADR-010`](docs/decisoes/ADR-010-dados-locais-primeiro.md))
- **Sem login:** a primeira abertura pede só o nome
- O Supabase deixa de ser obrigatório; o `.env` só é necessário para a importação da nuvem

### Adicionado
- Importação única da nuvem (Google ou e-mail), que só acrescenta o que ainda não existe
- Exportar e importar backup completo em JSON, e botão para abrir a pasta de dados
- Cópia automática do banco a cada versão nova, antes das migrações (guarda as 5 mais recentes)

### Removido
- Tela de login e saída da conta

## [0.3.0] - 2026-10-17

### Adicionado
- **Modo saúde** (opcional, desligado por padrão): lembretes de água, alongamento e descanso dos olhos ([`ADR-008`](docs/decisoes/ADR-008-lembretes-por-tempo-de-trabalho.md))
- Intervalos contados em tempo de trabalho: param nas pausas e com o app fechado
- Lembretes ficam na tela até a resposta: fazer, adiar 10 min ou dispensar
- Notificação do Windows quando a G.W.E.N. não está em primeiro plano
- Pausa de alongamento guiada, com um movimento por minuto
- Resumo do dia no dashboard (copos d'água, alongamentos) e próximo lembrete
- Registro das respostas em `gwen.wellness_events`
- Migração `003_gwen_wellness.sql`
- Atualização pelo próprio app: faixa "Atualizar e reiniciar", instalador assinado, dados preservados ([`ADR-009`](docs/decisoes/ADR-009-atualizacoes-sem-perder-dados.md))
- Workflow `release.yml`: tag `vX.Y.Z` gera o instalador e a Release com o `latest.json`
- Documentação no padrão com banner por documento, metadados e sumário, mais o gerador de banners em `_assets/gerador/banners-docs.html`

## [0.2.0] - 2026-10-17

### Adicionado
- Login com Google: no app, abre o navegador e volta pelo deep link `gwen://auth/callback`; no navegador, redirect normal ([`ADR-006`](docs/decisoes/ADR-006-login-google-por-deep-link.md))
- Modo claro, escuro ou seguindo o sistema, com Noir claro oficial ([`ADR-007`](docs/decisoes/ADR-007-modo-claro-como-terceiro-eixo.md))
- Paleta clara opcional no tema Personalizado, também no JSON (bloco `light`)
- Alternância rápida de claro e escuro na barra superior
- Seção Sobre nas Configurações, com autoria, versão e licença
- Migração `002_gwen_modo_claro.sql`

### Alterado
- Supabase em modo PKCE
- Botão do Google no padrão da marca (G colorido, sem o formato de comando do estilo Terminal)

## [0.1.0] - 2026-10-17

Primeira versão beta.

### Adicionado
- Login e cadastro com e-mail e senha (Supabase Auth), com perfil criado no primeiro login
- Categorias com tempo da semana na lateral
- Projetos com status, descrição, várias pastas e vários links
- Ações por pasta: VS Code, Explorer e Git Bash
- **Codar agora**: abre pastas e links marcados e inicia a sessão
- Sessões de tempo com estatísticas de hoje, semana, categoria e projetos concluídos no ano
- Modo pausa com cinco tipos (café, refeição, leitura, respiro, outra) e barra de energia
- Correção de sessão esquecida ao abrir o app
- Identidade Noir, tema Personalizado por HEX com importação e exportação em JSON
- Estilos Moderno e Terminal
- Tabelas no schema `gwen`, para dividir um projeto Supabase com outros apps
- Licença proprietária, todos os direitos reservados ([`LICENSE`](LICENSE), [`NOTICE.md`](NOTICE.md))
- Documentação de arquitetura, modelo de dados e decisões em [`docs/`](docs/)
