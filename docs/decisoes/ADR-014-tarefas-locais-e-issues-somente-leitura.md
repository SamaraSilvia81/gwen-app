<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/adr-014-claro.webp">
  <img src="../../_assets/banners/docs/adr-014.webp" alt="ADR-014 · Tarefas locais e Issues somente leitura" width="100%">
</picture>

# ADR-014 · Tarefas locais e Issues somente leitura

![status](https://img.shields.io/badge/status-aceita-0A0A0B) ![tipo](https://img.shields.io/badge/tipo-registro%20de%20decisão-3A3A3F) ![código](https://img.shields.io/badge/código-ADR--014-5E5E66)

| Campo | Valor |
|---|---|
| Código | `ADR-014` |
| Data | domingo, 18/10/2026 |
| Tipo | Registro de decisão |
| Status | Aceita |
| Decisão de | Samara Silvia |
| Redigido por | Samara Silvia |
| Referências | [`ADR-010`](ADR-010-dados-locais-primeiro.md), [`ADR-011`](ADR-011-shell-em-trilho-e-saude-com-fonte.md) |
| Histórico | [ver alterações](https://github.com/SamaraSilvia81/gwen-app/commits/main/docs/decisoes/ADR-014-tarefas-locais-e-issues-somente-leitura.md) |

**Sumário**

1. [Contexto](#-contexto)
2. [Decisão](#-decisão)
3. [Alternativas consideradas](#-alternativas-consideradas)
4. [Consequências](#-consequências)
5. [Revisitar quando](#-revisitar-quando)

---

### $ contexto

A G.W.E.N. abre o ambiente de cada projeto e mede o tempo, mas o "o que fazer" ficava fora dela: no Jira, no Trello, nas Issues do GitHub ou em lugar nenhum. A autora queria um quadro no estilo do Jira dentro do app e, quando o projeto já usa as Issues do GitHub, vê-las ali sem abrir o navegador.

### $ decisão

- **Tarefas próprias, no mesmo armazenamento dos projetos** (tabela `tasks`: SQLite local ou nuvem, [`ADR-010`](ADR-010-dados-locais-primeiro.md)).
- **Modelo no tamanho do Linear, não do Jira:** quatro status fixos (A fazer, Fazendo, Revisão, Feito), prioridade de 0 a 4, prazo, etiquetas livres e projeto. Sem workflows configuráveis, sprints, responsáveis ou permissões: é um app de uma pessoa.
- **Ordem manual por `position` decimal:** soltar entre duas tarefas grava o ponto médio, então só a tarefa movida é gravada.
- **Issues do GitHub somente leitura:** importar cria ou atualiza tarefas pela URL da Issue. Fechada vira Feito; reaberta volta para A fazer. Nada é escrito no GitHub.
- **Token opcional e local:** repositórios públicos funcionam sem token; o token (fine-grained, *Issues: Read-only*) fica no `localStorage` do computador, fora do perfil e da nuvem.
- **O repositório vem do link do projeto:** o link do GitHub que a 0.5 já preenche ao escolher a pasta.

### $ alternativas consideradas

| Opção | Por que não |
|---|---|
| Modelo do Jira (workflows, tipos de issue, sprints) | Complexidade feita para times; para uma pessoa vira burocracia |
| Sincronização nos dois sentidos com o GitHub | Exige token com escrita, resolver conflitos e lidar com campos que o GitHub não tem (prioridade, prazo). Fica para depois |
| GitHub Projects (v2) | Só existe na API GraphQL, com token obrigatório e um modelo de campos customizados por projeto. Mais trabalho para pouco ganho agora |
| Guardar o token no perfil | O perfil pode ir para a nuvem; um segredo não deve sair do computador |

### $ consequências

- Mudar a tarefa na G.W.E.N. não muda a Issue no GitHub. Ao importar de novo, título, etiquetas e estado vêm do GitHub; status local só muda quando a Issue fecha ou reabre.
- Sem token, o GitHub limita a 60 consultas por hora por IP; cada importação usa de 1 a 3.
- A tela de Tarefas filtra por projeto; clicar num projeto do painel, com a tela aberta, filtra o quadro.

### $ revisitar quando

- Houver necessidade de fechar a Issue ao mover para Feito: aí entra o token com escrita e a escrita só do estado.
- O calendário entrar: tarefas com prazo aparecem nele.

---

<picture>
  <source media="(prefers-color-scheme: light)" srcset="../../_assets/banners/docs/rodape-claro.webp">
  <img src="../../_assets/banners/docs/rodape.webp" alt="G.W.E.N. · rodapé da documentação" width="100%">
</picture>
