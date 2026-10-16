# Work Breakdown Structure (WBS) — Exercise 2

Objective: build a custom `useState` closure engine, route all events through a single root
delegation hub, and assemble a reactive Task Manager with filter toggles. Data flow is unidirectional.

> RULE: Never prompt AI with more than one sub-task at a time. One task = one commit.

| # | Task | Verification | Commit |
|---|------|--------------|--------|
| 2.0 | Project rules & WBS | Review | `chore: add project rules and task decomposition` |
| 2.1 | Import the verified VNode engine and toolchain from Exercise 1 | `npm test`, `npm run typecheck` | `chore: import vnode engine and toolchain from exercise 1` |
| 2.2 | Contract: hook and delegation types | `npm run typecheck` | `feat(types): define state and event delegation contracts` |
| 2.3 | `stateStore`, `resetCursor`, `commitRender`, `setRenderer` + hook-order invariant | Unit tests | `feat(state): implement stateStore and resetCursor engine` |
| 2.4 | `useState`: cursor closure, updater functions, `Object.is` bail-out, re-render trigger | Unit tests | `feat(state): implement reactive useState dispatcher` |
| 2.5 | Handler registry + `setupEventDelegation` on the root; `renderToDOM` stops attaching listeners | Unit tests (listener spy) | `feat(events): attach root event delegation listener` |
| 2.6 | `renderApp` render loop (reset cursor, mount, keep focus, commit) | Unit tests | `feat(core): add renderApp reactive render loop` |
| 2.7 | Reactive Task Manager (add, toggle, delete, filter toggles, clear completed) + checkpoint tests | Checkpoint tests + DevTools | `feat(ui): assemble reactive todo application` |
| 2.8 | README with run instructions and DevTools checklist | Manual review | `docs: add readme with devtools listener audit` |

## Checklist

- [x] Task 2.0: Write `project-rules.md` and `TASK_DECOMPOSITION.md`
- [x] Task 2.1: Import VNode engine (`createElement`, `renderToDOM`, audit) and toolchain from Exercise 1
- [x] Task 2.2: Define `SetStateAction`, `StateSetter`, `DelegatedEventType` contracts
- [x] Task 2.3: Implement `stateStore` + `resetCursor` engine with hook-order invariant
- [x] Task 2.4: Implement reactive `useState` dispatcher
- [x] Task 2.5: Attach root event delegation listener (no listeners on children)
- [x] Task 2.6: Implement `renderApp` render loop
- [x] Task 2.7: Assemble reactive Task Manager with dynamic filter toggles
- [ ] Task 2.8: Document the zero-orphan-listener DevTools audit in README
