# Changelog

Todas as mudanças relevantes da G.W.E.N. ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Corrigido
- **Apps web instalados (PWA) no mapeamento:** o YouTube instalado pelo Edge contava como `msedge.exe`, porque a janela de um PWA é do navegador. Agora o nativo lê o AppUserModelID da janela (no Edge, `www.youtube.com-<hash>_pd8mbgmqs65xy!App`; no Chrome, `Chrome._crx_<id>`) e o tempo entra como **YouTube (app web)** em Música e vídeo. Apps da Microsoft Store abertos pelo navegador (Netflix) entram como **Netflix (app)**. Outros PWAs ganham categoria pelo nome e dá para trocar em Ajustes, Mapeamento. Continua sem ler o título da janela ([`ADR-013`](docs/decisoes/ADR-013-sessoes-em-paralelo-e-mapeamento-local.md))

### Adicionado
- **Mídia em segundo plano no mapeamento:** o que está tocando pela mídia do Windows (a do controle de volume) também soma tempo, mesmo minimizado e sem teclado e mouse. YouTube minimizado, Spotify por baixo e Netflix contam enquanto estão em *play*; pausado não conta. Aba comum do navegador não entra, para não duplicar o tempo do navegador. Novo comando nativo `media_sessions`
- **O que está tocando, na barra de cima:** com o mapeamento ligado e algum app em *play* (YouTube, Spotify, Netflix), aparece um chip com o nome dele ao lado da sessão (`+1` quando há mais de um). Some quando pausa. O clique abre o Relatório direto em Apps e jogos

### Planejado
- Sincronização entre computadores (opcional)
- Calendário com o Google Calendar
- Caderno: playbook de padrões e modelos de documentação

## [0.9.1] - 2026-10-26

### Corrigido
- **Travamento no modo alongamento:** ao encerrar a pausa guiada, o overlay travava indefinidamente quando o banco não respondia a tempo. O botão ficava desabilitado e bloqueava toda a interface, incluindo os controles nativos do Tauri. Adicionados timeouts de 6s em `breakRepo.end` e 4s em `sessionRepo.addPaused`, com reset automático do estado em caso de falha. O botão agora mostra "Encerrando…" durante a operação e um aviso de erro se não concluir
- **Blur ausente na tela de pausa:** o overlay usava o token `--c-pause-veil` direto, sem `backdrop-filter`, então o fundo ficava só escuro, sem o efeito de desfoque. Adicionada a classe `.pause-overlay` com `blur(24px)`. O estilo Terminal mantém o comportamento sem blur
- **Nome cortado na saudação do Início:** o `display_name` era dividido por espaço e só o primeiro trecho era exibido (`~/` em vez de `~/ sammy.sh`). O nome completo é exibido agora
- **Linha do Git saindo do card:** na vista em grade, a linha com branch, alterações e data do último commit ultrapassava a borda do card. Adicionado `overflow-hidden` no container e as partes passam a truncar dentro do espaço disponível

### Adicionado
- **Abrir múltiplas frentes ao mesmo tempo:** com o projeto já ativo, o footer do card mostra um botão "+ Frente" quando há frentes que ainda não estão abertas em nenhuma sessão paralela. Selecionar uma frente chama `launchProject` e abre uma nova sessão para ela, sem encerrar as que já estão rodando

### Documentação
- Pasta `docs/feedbacks/` criada com o tipo `FBK` para registros de uso real
- [`FBK-001`](docs/feedbacks/FBK-001-feedback-uso-beta-0.9.md): feedback da autora após uma semana usando a 0.9.0, com bugs, melhorias e desejos para próximas versões
- `docs/README.md` atualizado: nova entrada para `FBK` na tabela de tipos e `FBK-001` no índice

## [0.9.0] - 2026-10-18

### Adicionado
- **Tarefas:** área nova no trilho, com kanban de quatro colunas (A fazer, Fazendo, Revisão, Feito) e vista em lista agrupada por status, no jeito do Linear ([`ADR-014`](docs/decisoes/ADR-014-tarefas-locais-e-issues-somente-leitura.md))
- **Arrastar e soltar** entre colunas e dentro da coluna para ordenar. Na lista, clicar no ícone de status passa para o próximo
- **Tarefa completa:** título, descrição, projeto, status, prioridade (sem, baixa, média, alta, urgente), prazo e etiquetas. Prazo de hoje, amanhã e atrasado aparece destacado
- **Criar rápido:** o `+` de cada coluna abre um campo para digitar o título e dar Enter. A tecla **N** abre uma tarefa nova
- **Issues do GitHub:** no projeto com link do GitHub, *Issues do GitHub* traz as Issues como tarefas (com número, etiquetas e link). Rodar de novo atualiza: fechada no GitHub vira Feito, reaberta volta para A fazer. Só leitura, nada é escrito no GitHub
- **Ajustes, Integrações:** token do GitHub (opcional) para repositórios privados e limite maior de consultas. Fica só neste computador
- **No Início,** o cartão Tarefas mostra o que está em andamento e o que vence primeiro, com um clique para concluir
- **No card do projeto,** o contador de tarefas abertas leva direto ao quadro daquele projeto. Na tela de Tarefas, clicar num projeto do painel filtra o quadro

### Migração
- Local: `006_tarefas.sql`, automática
- Nuvem: rode `supabase/migrations/008_gwen_tarefas.sql`. Sem ela, a tela de Tarefas avisa qual migração falta

## [0.8.0] - 2026-10-18

### Adicionado
- **Sessões em paralelo:** começar outro projeto não encerra o que já está aberto. A barra superior mostra quantas sessões estão rodando e abre a lista para encerrar cada uma; o Início mostra todas no cartão Agora. Dá para voltar ao jeito antigo (uma por vez) em Ajustes, Sistema ([`ADR-013`](docs/decisoes/ADR-013-sessoes-em-paralelo-e-mapeamento-local.md))
- **Linha do tempo:** uma faixa por projeto com o horário de cada sessão e os trechos em que duas ou mais rodaram juntas. No Início (hoje) e no Relatório, com navegação por dia
- **Lançador de apps:** cadastre Discord, WhatsApp, Spotify, Windows Terminal, Notion e qualquer programa (caminho do `.exe` com argumentos) ou protocolo (`app://`). Os apps aparecem no Início, no Ctrl + K e no cadastro do projeto, para abrir junto no Começar agora
- **Pastas no Windows Terminal e no PowerShell**, além de VS Code, Explorer e Git Bash
- **Mapeamento de apps e jogos** (opcional): a cada 15 segundos a G.W.E.N. vê qual programa está na frente e soma o tempo por app e por categoria (código, navegador, conversa, design, escrita, música, jogos). Sem teclado e mouse por alguns minutos, para de contar. Guarda só o nome do programa, nunca o título da janela, e só neste computador
- **Alertas de jogo e de trabalho:** "Você está jogando há 2h" e "3h trabalhando sem parar", com limites ajustáveis, no app e na notificação do Windows
- **Relatório em abas:** Projetos, Linha do tempo e Apps e jogos
- Ajustes ganham as seções **Apps** e **Mapeamento**

### Alterado
- **Hoje, semana, categorias e o total do relatório contam tempo de relógio:** com sessões em paralelo, a mesma hora não é somada duas vezes. O tempo de cada projeto continua inteiro
- **Pausa vale para todas as sessões abertas.** Encerrar uma sessão durante a pausa não encerra a pausa das outras
- Sessão esquecida: com várias abertas, a G.W.E.N. pergunta uma de cada vez
- Atualizar o app encerra todas as sessões abertas antes de reiniciar

### Migração
- Local: `005_lancador_e_atividade.sql`, automática
- Nuvem: rode `supabase/migrations/007_gwen_v08.sql`. Sem ela, a nuvem só aceita uma sessão por vez (a G.W.E.N. avisa) e os apps cadastrados não são salvos
- Nova dependência nativa: `windows-sys` (só no Windows), para o mapeamento

## [0.7.0] - 2026-10-18

### Adicionado
- **Início:** a tela de abertura do app. Capa com o wallpaper, saudação, o que está rodando agora (com Pausa e Encerrar), **Onde parei** com Continuar, barras da semana, projetos recentes e o cartão de saúde
- **Alertas de saúde com base em pesquisa:** semana acima de 44h (limite da Constituição) e de 55h (OMS/OIT, 2021), 90 minutos sem pausa (meta-análise de micropausas, 2022), trabalho depois das 23h em dois ou mais dias (consenso AASM/SRS sobre sono) e sete dias seguidos sem folga (pesquisa de recuperação de Sonnentag e Fritz). Cada alerta mostra a fonte ([`ADR-011`](docs/decisoes/ADR-011-shell-em-trilho-e-saude-com-fonte.md))
- **Perfil:** capa, foto grande, números do ano (horas, sessões, dias ativos, sequência atual e maior sequência, concluídos), mapa de atividade de 12 ou 6 meses e grades de hábitos (trabalho, pausas, água, alongamento, olhos) com sequência de dias. No fim, a lista das referências usadas nos lembretes e alertas
- **Painel de projetos em árvore:** coleções inteligentes (Fixados, Recentes, Em andamento, Parados) e as categorias como pastas que abrem e fecham, com os projetos dentro e o botão de começar sempre visível. Filtro por nome no topo
- **Fixar projeto:** alfinete no card. Fixados aparecem primeiro na lista e na coleção Fixados
- **Vista em lista** na tela de projetos, além da grade
- **Configurações por seções**, no padrão do CuraData: ao entrar em Ajustes, o painel lateral vira a navegação das seções (Perfil, Aparência, Interface, Modo saúde, Dados, Conta na nuvem, Sistema, Sobre), com Voltar e um grupo "Em breve". Clicar rola até a seção e a seção visível fica marcada. No topo, uma capa com o wallpaper, a foto e o nome. Em janela estreita, as seções viram abas no topo
- **Escala da interface:** padrão 90%. `Ctrl +`, `Ctrl -` e `Ctrl 0` em qualquer tela, também `Ctrl` + roda do mouse. Opção em Configurações, Interface
- **Bolha ao minimizar:** minimizou, aparece uma bolha redonda sempre no topo com o logo, o tempo da sessão e um anel com o andamento da hora. Arraste para mover (a posição fica salva); clique para voltar. Dá para desligar em Configurações, Interface

### Alterado
- **Navegação:** trilho de ícones à esquerda (Início, Projetos, Relatório, Perfil, Ajustes) e o painel de projetos ao lado, que abre e fecha pelo trilho ou com `Ctrl + B`. Em janela com menos de 1100px o painel vira gaveta
- **Responsividade:** janela mínima de 720 × 520 (antes 960 × 620); topbar, cards, lista e relatório se reorganizam em telas estreitas
- **Visual (estilo Moderno):** mais denso, no jeito do Linear (texto 13px, botões de 30px), cantos e seletor segmentado no jeito do iOS, títulos grandes por tela e o caminho da tela na topbar
- **Estilo Terminal no jeito do Atelier.sh:** títulos e números em Bebas Neue, rótulos mono em caixa alta bem espaçados, filtros com borda, foco com brilho, `$` nas buscas, barras listradas e scanlines. Os botões deixam de usar `[ ]`
- Os números de hoje e da semana saíram do topo da tela de projetos e foram para o Início

### Corrigido
- **Sessão que não aparecia (conta na nuvem):** projetos com frente começavam a sessão com a coluna `front`, e a nuvem sem a migração `005_gwen_frentes.sql` recusava o registro inteiro. A sessão anterior era encerrada e a nova não era criada. Agora a sessão é gravada mesmo assim (sem a frente) e um aviso diz qual migração rodar. Vale também para `pinned` (`006`)

### Documentação
- README atualizado para a 0.7: funcionalidades, como usar, temas, estrutura, roadmap e prints novos
- [`ADR-011`](docs/decisoes/ADR-011-shell-em-trilho-e-saude-com-fonte.md) (navegação em trilho e alertas de saúde com fonte) e [`ADR-012`](docs/decisoes/ADR-012-codigo-proprietario.md) (código público, todos os direitos reservados)

### Migração
- Local: `004_fixados.sql`, automática
- Nuvem (conta no próprio Supabase): rode `supabase/migrations/006_gwen_fixados.sql` no SQL Editor. Sem ela, o app continua funcionando, mas fixar um projeto dá erro
- Nova dependência: `@fontsource/bebas-neue`. Rode `yarn` antes do `yarn app`

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
