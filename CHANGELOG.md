# Changelog

Todas as mudanças relevantes da G.W.E.N. ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Sincronização entre computadores (opcional)
- Mapeamento de comportamento: foco, programas abertos e áudio, por categoria
- Widget flutuante "sempre no topo"

## [0.6.0] - 2026-10-17

### Adicionado
- **Bandeja do Windows:** ícone perto do relógio com o tempo da sessão no tooltip. Clique direito lista os projetos (e as frentes) para começar direto, sem abrir a janela, e encerra a sessão. Fechar a janela esconde na bandeja; dá para desligar em Configurações, Sistema
- **Ctrl + K:** paleta para começar um projeto digitando parte do nome. Também pelo botão de raio na barra superior
- **Onde parei:** ao encerrar uma sessão, a G.W.E.N. pergunta o próximo passo. A nota aparece no card, na paleta e volta no próximo Começar agora
- **Projetos parados:** aviso no card quando um projeto em andamento fica 30 dias sem abrir nem commitar
- **Descrição pelo README:** ao escolher a pasta, a descrição vazia é preenchida com o primeiro parágrafo do README (prefere a seção "Sobre"). Botão "Ler do README" para projetos que já existem
- **Comando por pasta:** um comando opcional (ex.: `yarn dev`) roda num PowerShell novo, dentro da pasta, no Começar agora
- **Relatório:** tempo por categoria, projeto e frente na semana, no mês, no mês passado ou nos últimos 30 dias, com exportação em CSV (uma linha por sessão, abre direto no Excel)
- Rascunho de projeto novo aparece como card no painel, com Continuar e Descartar

## [0.5.0] - 2026-10-17

### Adicionado
- **Status do Git no card:** branch, alterações sem commit, commits sem push, commits para puxar e data do último commit de cada pasta que é repositório. Atualiza ao voltar para a janela e a cada 2 minutos
- **Frentes:** pastas e links podem pertencer a uma frente do projeto (ex.: Landing e Plataforma). Com mais de uma frente, o Começar agora pergunta qual abrir, e a sessão guarda a frente para somar o tempo de cada uma
- **Várias ações por pasta:** a mesma pasta pode abrir no VS Code, no Explorer e no Git Bash juntos, sem cadastrar duas vezes
- **Link do repositório automático:** ao escolher uma pasta que é repositório Git, o link do GitHub (ou GitLab, Bitbucket) entra sozinho
- **Rascunho:** fechar o formulário de projeto novo sem salvar guarda o que já foi preenchido
- **Abrir com o Windows:** opção em Configurações, Sistema (plugin oficial de inicialização automática)
- **Abertura animada:** o G aparece, a barra do logo carrega e o nome se forma antes de entrar no app. Respeita o "reduzir movimento" do sistema

### Corrigido
- VS Code abrindo um arquivo vazio quando o caminho da pasta tinha espaço ou `&`: agora o `Code.exe` é chamado direto

### Alterado
- O instalador gerado é só o NSIS (`.exe`). O MSI (WiX) falhava em caminhos com `&`

### Migração
- Local: `003_frentes.sql`, automática
- Nuvem (conta no próprio Supabase): rode `supabase/migrations/005_gwen_frentes.sql` no SQL Editor. Sem ela, o app continua funcionando, mas sessões com frente não são salvas na nuvem

## [0.4.0] - 2026-10-17

### Alterado
- **Dados locais:** tudo fica num banco SQLite no computador, sem conta e sem internet ([`ADR-010`](docs/decisoes/ADR-010-dados-locais-primeiro.md))
- **Sem login obrigatório:** a primeira abertura pede só o nome e, se quiser, uma foto
- O Supabase deixa de ser obrigatório e o `.env` deixa de ser lido: a conexão é colada em Configurações e fica só neste computador
- O botão principal passa a se chamar **Começar agora**, e os textos e exemplos deixam de pressupor quem programa

### Adicionado
- **Conta na nuvem (avançado):** conectar ao próprio Supabase e entrar com Google ou e-mail para guardar os dados lá. Sair da conta volta ao modo local
- Importação única da nuvem (Google ou e-mail), que só acrescenta o que ainda não existe
- Exportar e importar backup completo em JSON, e botão para abrir a pasta de dados
- Cópia automática do banco a cada versão nova, antes das migrações (guarda as 5 mais recentes)
- Escolha da cor do texto sobre os acentos no tema Personalizado (Automático, Claro ou Escuro)

### Removido
- Tela de login obrigatória

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
