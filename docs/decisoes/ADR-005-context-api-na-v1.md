# ADR-005 · Context API na V1

| Código | Status | Data | Decisão de |
|---|---|---|---|
| `ADR-005` | Aceita | 17/10/2026 | Samara Silvia |

### $ contexto

O padrão nos projetos maiores (como o Summa.sh) é **Redux Toolkit**. A V1 da G.W.E.N. tem um estado pequeno: usuário e perfil, categorias, projetos, sessões da semana, sessão ativa e pausa ativa.

### $ decisão

Usar **Context API** com dois contextos de domínio e um de interface:

| Contexto | Guarda |
|---|---|
| `AuthContext` | usuário, perfil, login/cadastro, aparência |
| `WorkspaceContext` | categorias, projetos, sessões, pausas e as regras (iniciar, encerrar, pausar, corrigir sessão esquecida) |
| `ToastContext` | avisos na tela |

Os componentes acessam só pelos hooks `useAuth()`, `useWorkspace()` e `useToast()`.

### $ alternativas consideradas

| Opção | Por que não agora |
|---|---|
| Redux Toolkit | Mais estrutura (slices, store, thunks) do que o tamanho da V1 pede |
| Zustand | Leve e bom, mas seria uma biblioteca nova sem ganho claro sobre o Context nesse tamanho |
| TanStack Query para os dados | Resolveria cache e revalidação, mas a V1 carrega tudo uma vez e atualiza localmente após cada escrita |

### $ consequências

- Sem dependência extra e sem boilerplate.
- O `WorkspaceContext` concentra bastante lógica. Se crescer muito (detecção de janela, modo saúde), deve ser dividido.
- Os timers ao vivo usam o hook `useNow()`, que re-renderiza só quem precisa: o relógio da barra superior a cada segundo, as estatísticas a cada 30 segundos.
- Como os componentes só conhecem os hooks, trocar a implementação por Redux ou Zustand depois não muda os componentes.

### $ revisitar quando

- O `WorkspaceContext` passar de umas 400 linhas, ou precisar de estado compartilhado entre duas janelas (widget flutuante).
