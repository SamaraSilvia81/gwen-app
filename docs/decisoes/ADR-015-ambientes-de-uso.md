<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-015-claro.webp">
  <img src="../../_assets/banners/docs/adr-015.webp" alt="ADR-015 · Ambientes de uso" width="100%">
</picture>

# ADR-015 · Ambientes de uso

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--015-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-015` |
| Data | terça-feira, 17/11/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Referências | [`FBK-001`](../feedbacks/FBK-001-feedback-uso-beta-0.9.md), [`ADR-010`](ADR-010-dados-locais-primeiro.md), [`ADR-013`](ADR-013-sessoes-em-paralelo-e-mapeamento-local.md), [`ADR-014`](ADR-014-tarefas-locais-e-issues-somente-leitura.md) |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen-app/commits/main/docs/decisoes/ADR-015-ambientes-de-uso.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [O que muda em cada ambiente](#-o-que-muda-em-cada-ambiente)
4. [Alternativas consideradas](#-alternativas-consideradas)
5. [Consequências](#-consequências)
6. [Revisitar quando](#-revisitar-quando)

---

### $ contexto

A G.W.E.N. nasceu para TI. Ao criar um projeto, a pasta já vem marcada para abrir no VS Code, o campo "Comando ao começar" pede algo como `yarn dev`, os exemplos de texto citam `CuraData` e `C:\Projetos`, e as Issues do GitHub aparecem nas tarefas. Isso não serve para quem estuda, desenha ou só usa o computador para trabalhar.

O [`FBK-001`](../feedbacks/FBK-001-feedback-uso-beta-0.9.md) já registra o desejo de expandir para Acadêmico, Design e Geral, com o mesmo núcleo para todos (sessões, tempo, tarefas, pausa). O roadmap pede que o onboarding da 0.12 traga exemplos que não pressupõem programador. Faltava definir o que muda em cada ambiente.

O código já separa bem o que é genérico. O mapeamento de apps tem categorias como design, escrita, trabalho e conversa. O lançador abre qualquer programa. A linha de status do Git só aparece quando a pasta é um repositório. Sobra um conjunto pequeno de pontos que pressupõem TI.

### $ decisão

- **Quatro ambientes:** Geral, TI, Design e Acadêmico.
- **Escolha múltipla.** A pessoa marca um ou mais. Com mais de um, o app junta os recursos de todos. Quem não marca nada fica em Geral.
- **Só adaptação, não outro produto.** O ambiente muda ações da pasta, apps sugeridos, textos de exemplo e dois recursos exclusivos de TI. Sessões, tempo, tarefas, pausa, status de projeto, relatórios e dados são os mesmos.
- **Um arquivo de configuração por ambiente** no código (`src/lib/environments.js`), consultado pelas telas. Nenhuma tela decide por conta própria o que é "de TI".
- **Ambiente salvo no perfil**, na coluna `environments` (lista de ids em JSON), seguindo o [`ADR-010`](ADR-010-dados-locais-primeiro.md). Mudar de ideia depois é feito em Ajustes.
- **TI continua inteiro.** Dados, infra e suporte não viram ambientes separados: a diferença entre eles é só qual programa abre, e o lançador abre qualquer um. A lista de apps sugeridos de TI inclui Power BI, DBeaver, Docker e Postman.
- **Status de projeto fixos** (`ideia`, `andamento`, `pausado`, `concluido`) para todos os ambientes. O FBK-001 sugere status por ambiente, mas isso mexe em dados, relatórios e filtros. Fica fora.
- **Freela não é ambiente, é plano.** Clientes e Finanças valem para qualquer área e seguem no plano Freelance do roadmap.

### $ o que muda em cada ambiente

| | Geral | TI | Design | Acadêmico |
|---|---|---|---|---|
| Para quem | quem usa o computador para trabalhar em geral | dev, dados, infra, suporte | UI, gráfico, vídeo | estudante, pesquisa, mestrado |
| Abrir pasta com | Explorer | VS Code, Git Bash, Terminal, PowerShell | Explorer | Explorer |
| Ação padrão ao criar projeto | Explorer | VS Code | Explorer | Explorer |
| Campo "Comando ao começar" | oculto | visível | oculto | oculto |
| Issues do GitHub nas tarefas | ocultas | visíveis | ocultas | ocultas |
| Apps sugeridos | Word, Excel, Edge, WhatsApp, Spotify, Canva, Discord, Slack, Teams | VS Code, Windows Terminal, Docker, DBeaver, Postman, Power BI, Discord, Slack, Teams | Figma, Photoshop, Illustrator, Premiere, Blender, Canva | Zotero, Word, Overleaf, Obsidian, Notion, Canva |
| Exemplos de texto | nomes e caminhos genéricos (`Relatório`, `C:\Trabalho`) | `CuraData`, `C:\Projetos` | `Identidade visual`, `C:\Design` | `Capítulo 2`, `C:\Mestrado` |

**Regras para escolha múltipla**

- **Ações da pasta:** união das ações dos ambientes marcados. O Explorer está sempre disponível.
- **Ação padrão:** VS Code se TI estiver marcado; senão, Explorer.
- **Comando ao começar e Issues:** aparecem se TI estiver marcado.
- **Apps sugeridos:** união, sem repetir. O Canva aparece em Geral, Design e Acadêmico, então quem usa Canva de vez em quando não precisa marcar Design.
- **Exemplos de texto:** vêm do primeiro ambiente marcado.

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Escolha única de ambiente | Quem é TI e Acadêmico, como a autora, ficaria sem metade dos recursos |
| Dividir TI em dados, infra e suporte | A diferença é só quais programas abrem, e o lançador já abre qualquer um. Se fizer falta, entram chips de foco dentro de TI que mudam só as sugestões |
| Status de projeto por ambiente | Mexe em dados, relatórios e filtros, e `ideia`, `andamento`, `pausado` e `concluido` servem para todos |
| Ambiente "Freela" | Clientes e Finanças não dependem da área. É um plano, não um ambiente |
| Deixar cada tela esconder o que é de TI | Espalha a regra pelo código e esquece telas. A configuração central evita isso |
| Escolher só no onboarding | Quem já usa o app nunca veria a escolha, e mudar de ideia exigiria apagar dados. Ajustes também permite trocar |

### $ consequências

- Os usuários do beta fechado, que já usam a G.W.E.N. como TI, recebem `environments = ['ti']` na primeira abertura depois da atualização. Nada muda para eles ([`ADR-009`](ADR-009-atualizacoes-sem-perder-dados.md)).
- Projetos e pastas já criados não são alterados. Se uma pasta tem VS Code como ação e o ambiente deixa de incluir TI, a ação continua funcionando; só deixa de ser oferecida em projetos novos.
- O ambiente só filtra o que é **oferecido**. Nenhum dado é apagado ao trocar de ambiente.
- [`DAT-001`](../DAT-001-modelo-de-dados.md) ganha a coluna `environments` na tabela `profiles` e a migração correspondente.
- Apps sem protocolo conhecido (Docker, DBeaver, Photoshop, Illustrator, Premiere, Blender) aparecem como sugestão que preenche o nome e pede o caminho do executável.
- Reconhecer Power BI e outros programas de dados no mapeamento de tempo por programa é uma mudança separada. Ela independe do ambiente e ainda não foi feita.
- O onboarding passa a ter seis etapas, todas à vista no topo desde a primeira tela: você, ambientes, aparência, apps, saúde e um resumo. Ambientes em branco valem Geral, e as sugestões de apps seguem os ambientes marcados. Tudo é opcional e muda depois em Ajustes. A configuração por ambiente foi feita antes dele, para o onboarding só consumir. Quem escolhe importar da nuvem pula as etapas e recebe os ambientes que estiverem lá.
- Um novo ambiente passa a ser um objeto novo em `src/lib/environments.js`, sem mexer nas telas.

### $ revisitar quando

- Houver pedido real de foco dentro de TI (dados, infra), caso em que entram chips que mudam só as sugestões.
- Surgir um ambiente que precise de status de projeto próprios.
- O plano Acadêmico do roadmap for desenhado, para ligá-lo aos ambientes do onboarding.

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
