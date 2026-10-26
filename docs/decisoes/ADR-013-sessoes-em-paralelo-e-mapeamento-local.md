<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-013-claro.webp">
  <img src="../../_assets/banners/docs/adr-013.webp" alt="ADR-013 · Sessões em paralelo e mapeamento local" width="100%">
</picture>

# ADR-013 · Sessões em paralelo e mapeamento local

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--013-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-013` |
| Data | domingo, 18/10/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Referências | [`ADR-003`](ADR-003-tempo-por-sessao-manual-na-v1.md), [`ADR-010`](ADR-010-dados-locais-primeiro.md), [`ADR-011`](ADR-011-shell-em-trilho-e-saude-com-fonte.md) |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen-app/commits/main/docs/decisoes/ADR-013-sessoes-em-paralelo-e-mapeamento-local.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [Alternativas consideradas](#-alternativas-consideradas)
4. [Consequências](#-consequências)
5. [Revisitar quando](#-revisitar-quando)

---

### $ contexto

Até a 0.7, começar um projeto encerrava o que estivesse aberto: uma sessão por vez, garantida por um índice único na nuvem. No uso real, a autora trabalha em mais de um projeto ao mesmo tempo (um build rodando em um, a escrita em outro) e perdia o registro do primeiro.

A 0.8 também passa a ver qual programa está em primeiro plano, para mostrar onde o tempo vai e avisar sobre jogo e trabalho longos. Isso é dado sensível: o nome de uma janela pode revelar documento, conversa ou site.

### $ decisão

**Sessões em paralelo, por padrão.**

- Várias sessões podem ficar abertas. A mesma frente do mesmo projeto não abre duas vezes.
- **Tempo de projeto** soma a sessão inteira. **Hoje, semana, categoria e total do relatório** contam a união dos intervalos (tempo de relógio), para a mesma hora não valer duas vezes. As pausas entram na mesma proporção das sessões (`unionSeconds` em `src/lib/time.js`).
- **A pausa vale para todas as sessões abertas.** Ao terminar, cada sessão recebe o trecho em comum como pausa. Encerrar uma sessão durante a pausa desconta a parte dela e mantém a pausa das outras.
- Quem prefere o jeito antigo desliga em Ajustes, Sistema, *Sessões em paralelo*.
- Na nuvem, o índice `sessions_one_active` sai (migração `007_gwen_v08.sql`).

**Mapeamento opcional e só local.**

- Desligado por padrão. Ligado, lê a cada 15 s o executável em primeiro plano e o tempo ocioso pela API do Windows (`windows-sys`).
- **Nunca lê o título da janela.** Guarda executável, caminho, categoria e segundos por dia.
- Fica na tabela `app_usage` do SQLite **mesmo no modo conta**, pelo `deviceStore`. Não existe tabela dela na nuvem.
- Sem teclado e mouse por alguns minutos (padrão 5), não conta.
- Categoria por regra (lista de executáveis e pastas de jogos como `steamapps\common`), e a escolha da pessoa vence a regra.
- **Apps web instalados (PWA)**, como o YouTube pelo Edge, têm janela do próprio navegador. Para não virarem tempo de navegador, o nativo lê o AppUserModelID da janela pelo crate `windows` (COM): no Edge `www.youtube.com-<hash>_pd8mbgmqs65xy!App`, no Chrome `Chrome._crx_<id>`. O JS traduz para `<Nome> (app web)` (`appFromAumid` em `src/lib/activity.js`). Continua sem título de janela, e abas comuns seguem como navegador.
- **Mídia em segundo plano.** Vídeo e música rodam minimizados, então só a janela da frente perde esse tempo. O nativo lê as sessões de mídia do Windows (`GlobalSystemMediaTransportControlsSessionManager`, WinRT) e cada app em *play* soma tempo, mesmo ocioso, uma vez por app e sem repetir o da frente. O ID padrão do navegador (`MSEdge`, `Chrome`) é ignorado, então aba comum tocando não conta.
- Alertas por sequência na mesma categoria, com tolerância de 5 minutos fora dela: jogo (padrão 120 min) e trabalho em código, docs, design e escrita (padrão 180 min). Depois do primeiro aviso, um a cada hora a mais.

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Manter uma sessão por vez | Perde o registro de trabalho real em paralelo |
| Somar o tempo das sessões no dia | Infla o dia: duas sessões de 1h viram 2h de "trabalho" |
| Dividir o tempo em comum entre os projetos | Cada projeto perderia tempo que de fato recebeu atenção; a soma por projeto inteira é mais honesta para cobrar e planejar |
| Guardar o título da janela | Mais detalhe, mas expõe documentos, conversas e sites. Não é necessário para categorizar |
| Mapeamento na nuvem | Volume alto e dado sensível fora do computador, sem ganho para quem usa um computador só |

### $ consequências

- `WorkspaceContext` expõe `activeSessions` (lista) e mantém `activeSession` (a mais recente) para o que só precisa de uma.
- O "onde parei" pergunta qual sessão encerrar quando há várias; a bandeja e o Ctrl + K têm uma ação de encerrar por sessão.
- A bolha mostra a sessão aberta há mais tempo e quantas estão em paralelo.
- O relatório mostra os dois números quando há sobreposição: tempo de relógio e a soma dos projetos.
- O mapeamento depende do Windows; em outros sistemas o comando nativo devolve vazio e nada é registrado.

### $ revisitar quando

- Houver sincronização entre computadores: decidir se o tempo por app viaja (provavelmente agregado por categoria, nunca por app).
- Alguém pedir o título da janela para separar sites do navegador: só com consentimento explícito e filtro por domínio.

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
