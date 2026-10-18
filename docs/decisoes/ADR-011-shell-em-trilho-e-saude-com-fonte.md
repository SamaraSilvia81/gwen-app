<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-011-claro.webp">
  <img src="../../_assets/banners/docs/adr-011.webp" alt="ADR-011 · Shell em trilho e saúde com fonte" width="100%">
</picture>

# ADR-011 · Shell em trilho e saúde com fonte

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--011-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-011` |
| Data | domingo, 18/10/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Referências | [`ADR-004`](ADR-004-identidade-noir-e-temas-por-tokens.md), [`ADR-008`](ADR-008-lembretes-por-tempo-de-trabalho.md), [`ADR-010`](ADR-010-dados-locais-primeiro.md) |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen-app/commits/main/docs/decisoes/ADR-011-shell-em-trilho-e-saude-com-fonte.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [Alternativas consideradas](#-alternativas-consideradas)
4. [Consequências](#-consequências)
5. [Revisitar quando](#-revisitar-quando)

---

### $ contexto

Até a 0.6, a G.W.E.N. tinha uma barra lateral fixa de 248px com as categorias e duas telas (projetos e relatório). Com o uso diário apareceram três problemas:

- **Tudo grande demais.** Texto de 14px, botões de 34px e janela mínima de 960px deixavam pouco espaço em telas de notebook, e não havia como reduzir.
- **Sem lugar para crescer.** As próximas versões trazem tarefas, calendário, caderno e ideias. Uma barra lateral única não comporta áreas novas sem virar uma lista sem fim.
- **Saúde sem critério.** Os lembretes da 0.3 usam intervalos sensatos, mas a G.W.E.N. não dizia de onde vinham, e não havia nenhum olhar para a semana como um todo.

As referências de interface escolhidas foram iOS (acabamento), Postman (estrutura de trilho e coleções) e Linear (densidade e teclado). O estilo Terminal passa a seguir o Atelier.sh.

### $ decisão

**Navegação em duas camadas.**

- Um **trilho de ícones** (68px) com as áreas do app: Início, Projetos, Relatório, Perfil e Ajustes. Áreas novas entram aqui.
- Um **painel de projetos** (264px) ao lado, com coleções inteligentes e as categorias em árvore. Abre e fecha com `Ctrl + B`. Abaixo de 1100px vira gaveta por cima do conteúdo.
- O painel fica igual em todas as áreas: ele é o navegador de projetos, não um menu da tela atual.

**Escala pela webview.** A escala usa o `setZoom` da própria webview do Tauri, com padrão de 90% e atalhos `Ctrl +`, `Ctrl -` e `Ctrl 0`. Fica no `localStorage`, porque depende da tela, não da pessoa.

**Bolha como segunda janela.** A bolha ao minimizar é uma janela declarada no `tauri.conf.json` (label `bubble`), transparente, sem borda, sempre no topo e fora da barra de tarefas. Ela roda a mesma página com `#bolha` e recebe o estado da sessão por evento (`bolha://estado`), sem abrir o banco.

**Alertas de saúde só com fonte.** Cada alerta da home parte de uma referência publicada, mostrada no próprio alerta e listada no perfil (`src/lib/healthInsights.js`):

| Alerta | Limite | Fonte |
|---|---|---|
| Semana cheia | 44h | Constituição Federal, art. 7º, XIII |
| Semana longa | 55h | Pega et al. (2021), estimativa conjunta OMS/OIT |
| Tempo sem pausa | 90 min | Albulescu et al. (2022), meta-análise de micropausas |
| Trabalho de madrugada | depois das 23h em 2 dias ou mais | Watson et al. (2015), consenso AASM/SRS sobre sono |
| Sem folga | 7 dias seguidos | Sonnentag & Fritz (2007), experiências de recuperação |

Os limites de 90 minutos e de dois dias são escolhas da G.W.E.N. em cima dessas referências, não números tirados delas.

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Manter a barra lateral única e acrescentar itens | Não escala para tarefas, calendário e caderno; mistura áreas com filtros |
| Zoom por tokens (diminuir fontes e espaçamentos no CSS) | Exigiria revisar cada tela a cada mudança. O zoom da webview escala tudo junto, como no navegador |
| Bolha desenhada dentro da janela principal | Some quando a janela é minimizada, que é justamente quando ela precisa aparecer |
| Criar a janela da bolha pelo JavaScript na hora | Pede a permissão de criar janelas. Declarar no `tauri.conf.json` deixa a permissão menor e a janela pronta |
| Pontuação de bem-estar ou perfil de personalidade a partir do uso | Não há validação científica para inferir isso do tempo de tela. A G.W.E.N. aplica referências conhecidas e não diagnostica |

### $ consequências

- **Nova coluna `pinned`** em `projects`: migração local `004_fixados.sql` (automática) e da nuvem `006_gwen_fixados.sql`. O repositório só grava `pinned` quando o campo vem no rascunho, para a nuvem sem a 006 continuar aceitando edições.
- **Permissões novas** na capability: mostrar, esconder, focar, restaurar, posicionar e arrastar janelas, e mudar o zoom da webview. A capability passa a valer para `main` e `bubble`.
- **Dependência nova:** `@fontsource/bebas-neue`, só usada no estilo Terminal.
- No **Noir** os mapas de calor ficam em cinzas, porque usam o acento do tema. No tema Personalizado ganham a cor da pessoa.
- Os números de hoje e da semana saem da tela de projetos e vão para o Início.

### $ revisitar quando

- Tarefas e calendário entrarem: decidir se o painel ganha abas por área ou se cada área do trilho tem o próprio painel.
- Houver check-in de humor ou de energia: usar um questionário validado (por exemplo o WHO-5) em vez de criar uma escala própria.
- Alguém pedir os mapas de calor coloridos no Noir: avaliar uma paleta de hábitos fora da identidade preto e branco.

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
