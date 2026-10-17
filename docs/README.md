# Documentação da G.W.E.N.

| Código | Título | Tipo | Atualizado |
|---|---|---|---|
| [`ARQ-001`](ARQ-001-visao-geral.md) | Visão geral da arquitetura | Arquitetura | 17/10/2026 |
| [`DAT-001`](DAT-001-modelo-de-dados.md) | Modelo de dados | Dados | 17/10/2026 |
| [`ADR-001`](decisoes/ADR-001-tauri-em-vez-de-electron.md) | Tauri em vez de Electron | Decisão | 17/10/2026 |
| [`ADR-002`](decisoes/ADR-002-schema-proprio-em-projeto-compartilhado.md) | Schema próprio num projeto Supabase compartilhado | Decisão | 17/10/2026 |
| [`ADR-003`](decisoes/ADR-003-tempo-por-sessao-manual-na-v1.md) | Tempo por sessão manual na V1 | Decisão | 17/10/2026 |
| [`ADR-004`](decisoes/ADR-004-identidade-noir-e-temas-por-tokens.md) | Identidade Noir e temas por tokens | Decisão | 17/10/2026 |
| [`ADR-005`](decisoes/ADR-005-context-api-na-v1.md) | Context API na V1 | Decisão | 17/10/2026 |
| [`ADR-006`](decisoes/ADR-006-login-google-por-deep-link.md) | Login com Google por deep link | Decisão | 17/10/2026 |
| [`ADR-007`](decisoes/ADR-007-modo-claro-como-terceiro-eixo.md) | Modo claro como terceiro eixo da aparência | Decisão | 17/10/2026 |
| [`ADR-008`](decisoes/ADR-008-lembretes-por-tempo-de-trabalho.md) | Lembretes de saúde por tempo de trabalho | Decisão | 17/10/2026 |

### $ como os documentos se organizam

| Prefixo | Tipo | Quando criar |
|---|---|---|
| `ARQ` | Arquitetura | Visão de como as partes se encaixam. Muda pouco |
| `DAT` | Dados | Tabelas, relações, regras de cálculo |
| `ADR` | Registro de decisão | Toda escolha que teve alternativas reais e que alguém vai perguntar "por que assim?" |

**ADRs não são editados depois de aceitos.** Se uma decisão mudar, cria-se um ADR novo que substitui o antigo, e o antigo ganha o status `Substituída por ADR-00X`. Assim o histórico do raciocínio fica preservado.

Status possíveis: `Proposta` · `Aceita` · `Substituída` · `Descartada`.
