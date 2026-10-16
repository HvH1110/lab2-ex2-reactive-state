# Lab 02 · Exercise 2: Reactive State Machine & Delegation Hub

A custom `useState` closure engine and a single root event-delegation hub, built on top of the
Exercise 1 VNode engine ([lab2-ex1-mini-react](https://github.com/HvH1110/lab2-ex1-mini-react)),
powering a reactive Task Manager with dynamic filter toggles.

- Rules: [project-rules.md](project-rules.md)
- Work breakdown: [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md)

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + checkpoint tests (Vitest, jsdom)
npm run typecheck  # tsc --noEmit (strict)
npm run build      # typecheck + production bundle
```

## Structure

| File | Responsibility |
|------|----------------|
| `src/state-store.ts` | External state memory: `states[]` + `cursor`, `resetCursor`, `commitRender`, `setRenderer`, hook-order invariant |
| `src/use-state.ts` | `useState`: slot closure, updater functions, `Object.is` bail-out, re-render trigger |
| `src/events.ts` | Handler registry (`WeakMap`) and `setupEventDelegation` (one listener per event type, on the root) |
| `src/reactive-engine.ts` | `renderApp`: reset cursor → render → mount → commit, focus restore, `onCommit` hook |
| `src/task-app.ts` | Task Manager: pure state transitions, pure view functions, `TaskApp` root component |
| `src/create-element.ts`, `src/render-to-dom.ts`, `src/audit.ts` | VNode engine from Exercise 1 (`renderToDOM` now registers handlers instead of attaching listeners) |

## How it works

### State: cursor and closures

```
render pass:  resetCursor() ─► TaskApp() ─► useState(tasks) → slot 0
                                           useState(filter) → slot 1
              mount(tree) ─► commitRender()   // throws if hook count changed
click:        setFilter('DONE') ─► states[1] = 'DONE' ─► triggerRender() ─► next render pass
```

- Each setter closes over the slot index it was created with, so it always writes the right state.
- Updaters (`setTasks((prev) => addTask(prev, title))`) receive the latest stored value.
- `Object.is(prev, next)` skips the re-render when nothing changed.
- Invariants: hooks outside render throw, setters called during render throw, and a changed hook count between
  renders (conditional hook) throws `Rules of Hooks violated`.
- A slot is initialised only when it is empty. The slide version `states[i] ?? initialValue` would reset state
  that was deliberately set to `null` back to its initial value; `tests/use-state.test.ts` covers this.

### Events: root delegation hub

- `renderToDOM` stores `onClick` / `onChange` / `onSubmit` / ... in a `WeakMap<Element, handlers>` and never
  calls `addEventListener` on rendered elements.
- `setupEventDelegation(root)` attaches **one** listener for each of `click`, `input`, `change`, `keydown`, `submit`
  to the root. On an event it walks from `event.target` up to the root, calling registered handlers, and stops when
  `stopPropagation()` was called.
- Because every render re-mounts a fresh DOM tree, old elements and their registry entries are simply garbage
  collected. No listener ever has to be removed.

### Unidirectional data flow

`TaskApp` is the only component with state. `TaskForm`, `FilterBar`, `TaskList`, `TaskItem` are pure, typed
functions: data goes down as props, changes go up through callbacks (`onAdd`, `onToggle`, `onDelete`, `onChange`).
Counts and the filtered list are derived during render.

## Checkpoint: zero orphan event listeners

Automated (`tests/task-app.test.ts`, `CHECKPOINT` test): after adding, toggling and filtering, every
`addEventListener` call targeted the root, exactly once per delegated event type, and no button has an inline
`on*` attribute.

Manual DevTools audit:

1. `npm run dev`, open the page in Chrome, open DevTools.
2. Mutate state through the UI: add a task, tick a checkbox, switch filters, delete a task.
3. **Console**: each change logs `[commit #n] audit PASS: X VNodes ↔ X DOM nodes` and the state array.
4. **Console**, run:
   ```js
   getEventListeners(document.getElementById('app'))        // click, input, change, keydown, submit: 1 each
   [...document.querySelectorAll('#app button')]
     .map((b) => [b.id, Object.keys(getEventListeners(b)).length])   // every button → 0
   ```
5. **Elements** → select any `<button>` → **Event Listeners** tab with *Ancestors* unticked: empty.
   With *Ancestors* ticked, only the `body#app` listeners appear.
6. **Elements**: no `<div>` / `<span>`; the task added as `<img src=x onerror=alert(1)>` shows as text.

## Commit history

Each task in `TASK_DECOMPOSITION.md` is one Conventional Commit. Mandatory milestones:

- `feat(state): implement stateStore and resetCursor engine`
- `feat(state): implement reactive useState dispatcher`
- `feat(events): attach root event delegation listener`
- `feat(ui): assemble reactive todo application`
