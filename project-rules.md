# Project Rules — Lab 02 / Exercise 2: Reactive State Machine & Delegation Hub

These rules are binding for every human or AI contribution to this repository.
A change that violates any rule below must not be committed. Exercise 1 rules (VNode contract,
XSS prevention, zero div-soup) still apply and are repeated here so this repo stands alone.

## 1. Workflow (Anti-Monolithic Vibe Coding)

1. **Functional slicing**: work only on tasks listed in `TASK_DECOMPOSITION.md`.
2. **Contract first**: types/interfaces are written *before* the code that uses them.
3. **Atomic generation**: one sub-task per prompt and one sub-task per commit. Never prompt AI with more than one sub-task at a time.
4. **Independent verification**: every task is verified (unit test, `npm run typecheck`, DevTools, `git diff`) before it is committed.
5. Tick the matching checkbox in `TASK_DECOMPOSITION.md` in the same commit that completes the task.

## 2. Git

- Conventional Commits: `type(scope): imperative summary`. Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
- Mandatory milestone commit messages (exact text):
  - `feat(state): implement stateStore and resetCursor engine`
  - `feat(state): implement reactive useState dispatcher`
  - `feat(events): attach root event delegation listener`
  - `feat(ui): assemble reactive todo application`
- `npm test` and `npm run typecheck` must pass before every commit.
- Never commit `node_modules/`, `dist/`, or editor/OS junk.

## 3. Language & Tooling

- TypeScript `strict` mode; no `any` (use `unknown` + typeguards).
- ES modules only, bundled with **Vite**. No Babel standalone, no CDN script tags.
- **BANNED:** `var` and implicit globals. Use `const` / `let`.
- **BANNED:** `keypress` and `e.keyCode`. Use `keydown` and `e.key` / `e.code`.

## 4. Reactive State (Hooks)

- State lives in the external `stateStore` (linear array + cursor), never inside the component function.
- `resetCursor()` starts every render pass; `commitRender()` ends it.
- **Rules of Hooks:** call `useState` only at the top level of a component, during render. Never inside `if`, loops,
  nested functions or event handlers. The engine throws if the hook count changes between renders.
- Never mutate state in place (`tasks.push(...)`). Always pass a new value or an updater: `setTasks((prev) => [...prev, task])`.
- A setter only triggers a re-render when the value actually changes (`Object.is`).
- Calling a setter during render is forbidden (it would loop forever) and throws.

## 5. Events (Root Delegation Hub)

- **BANNED:** `addEventListener` on rendered child elements, and inline handler attributes (`onclick="..."`).
- `onXxx` props are stored in a registry (`WeakMap<Element, handlers>`). One listener per event type is attached
  to the root container by `setupEventDelegation`, which dispatches by walking from `event.target` up to the root.
- Only bubbling event types listed in `DELEGATED_EVENTS` are allowed; any other `onXxx` prop throws at render time.
- `event.stopPropagation()` inside a handler stops the virtual bubbling.

## 6. Unidirectional Data Flow

- Data flows down through props; changes flow up through callbacks passed as props.
- Child components are pure functions of their props and never mutate them.
- Derived values (filtered list, counters) are computed during render, never stored in state.

## 7. Security (XSS Prevention)

- **BANNED:** `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`.
- Text is created only via `document.createTextNode`. Props are written with `setAttribute`.
- User input (task titles) is rendered as text children, never as markup.

## 8. Semantic HTML (Zero div-soup)

- **BANNED:** `<div>` and `<span>` as structural containers.
- Use `<main>`, `<header>`, `<section>`, `<form>`, `<fieldset>`/`<legend>`, `<ul>`/`<li>`, `<label>`, `<button>`, `<footer>`.
- Toggle buttons expose their state with `aria-pressed`; every input has a `<label>`.

## 9. Verification / DevTools Audit

- After every render, the DOM must mirror the VNode tree 1:1 (`auditMount`).
- **Zero orphan listeners:** in DevTools, `getEventListeners(button)` returns `{}` for every rendered button;
  only the root container has listeners (one per delegated event type).
