import { auditMount } from '../src/audit';
import { getHandler } from '../src/events';
import { renderApp, type AppHandle } from '../src/reactive-engine';
import { inspectStateStore } from '../src/state-store';
import {
  TaskApp,
  addTask,
  clearCompleted,
  filterTasks,
  removeTask,
  toggleTask,
  type Task,
} from '../src/task-app';
import { DELEGATED_EVENTS } from '../src/types';

describe('pure task transitions', () => {
  const tasks: readonly Task[] = Object.freeze([
    Object.freeze({ id: 'a', title: 'A', done: false }),
    Object.freeze({ id: 'b', title: 'B', done: true }),
  ]);

  it('never mutate their input (inputs are frozen)', () => {
    expect(addTask(tasks, 'C')).toHaveLength(3);
    expect(toggleTask(tasks, 'a')[0]?.done).toBe(true);
    expect(removeTask(tasks, 'a').map((t) => t.id)).toEqual(['b']);
    expect(clearCompleted(tasks).map((t) => t.id)).toEqual(['a']);
    expect(tasks).toHaveLength(2);
  });

  it('toggleTask keeps untouched tasks by reference', () => {
    const next = toggleTask(tasks, 'a');
    expect(next[1]).toBe(tasks[1]);
    expect(next[0]).not.toBe(tasks[0]);
  });

  it('filters by status', () => {
    expect(filterTasks(tasks, 'ALL')).toBe(tasks);
    expect(filterTasks(tasks, 'ACTIVE').map((t) => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, 'DONE').map((t) => t.id)).toEqual(['b']);
  });
});

describe('Checkpoint 2: reactive Task Manager', () => {
  let root: HTMLElement;
  let app: AppHandle;
  let audits: boolean[];
  const spyOnListeners = () => vi.spyOn(EventTarget.prototype, 'addEventListener');
  let addListener: ReturnType<typeof spyOnListeners>;

  const $ = <E extends Element = HTMLElement>(selector: string): E => {
    const element = root.querySelector<E>(selector);
    if (element === null) throw new Error(`not found: ${selector}`);
    return element;
  };
  const titles = (): string[] => [...root.querySelectorAll('.task__label')].map((l) => l.textContent ?? '');
  const summary = (): string | null => $('.summary').textContent;
  const addViaForm = (title: string): void => {
    $<HTMLInputElement>('#new-task').value = title;
    $('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  beforeEach(() => {
    root = document.createElement('body');
    document.documentElement.replaceChild(root, document.body);
    addListener = spyOnListeners();
    audits = [];
    app = renderApp(TaskApp, root, { onCommit: (tree, container) => audits.push(auditMount(tree, container).ok) });
  });

  afterEach(() => {
    addListener.mockRestore();
    app.unmount();
  });

  it('renders the initial tasks with semantic markup and zero div-soup', () => {
    expect(titles()).toEqual(['Review PR', 'Verify AST']);
    expect(summary()).toBe('Tasks: 2 · Active: 2 · Done: 0');
    expect(root.querySelector('main > header > h1')).not.toBeNull();
    expect(root.querySelector('main > form label[for="new-task"]')).not.toBeNull();
    expect(root.querySelector('section[aria-labelledby="list-title"] fieldset > legend')).not.toBeNull();
    expect(root.querySelector('div, span')).toBeNull();
  });

  it('adds a task through the form and clears the input', () => {
    addViaForm('  Write tests  ');
    expect(titles()).toEqual(['Review PR', 'Verify AST', 'Write tests']);
    expect(summary()).toBe('Tasks: 3 · Active: 3 · Done: 0');
    expect($<HTMLInputElement>('#new-task').value).toBe('');
  });

  it('ignores blank titles', () => {
    addViaForm('   ');
    expect(titles()).toHaveLength(2);
    expect(audits).toHaveLength(1); // no re-render happened
  });

  it('toggles a task with the checkbox', () => {
    $('.task input[type="checkbox"]').click();
    expect($<HTMLInputElement>('.task input[type="checkbox"]').checked).toBe(true);
    expect($('.task').classList.contains('task--done')).toBe(true);
    expect(summary()).toBe('Tasks: 2 · Active: 1 · Done: 1');
  });

  it('switches filters with aria-pressed toggles', () => {
    $('.task input[type="checkbox"]').click();

    $('#filter-DONE').click();
    expect(titles()).toEqual(['Review PR']);
    expect($('#filter-DONE').getAttribute('aria-pressed')).toBe('true');
    expect($('#filter-ALL').getAttribute('aria-pressed')).toBe('false');

    $('#filter-ACTIVE').click();
    expect(titles()).toEqual(['Verify AST']);

    $('#filter-ALL').click();
    expect(titles()).toEqual(['Review PR', 'Verify AST']);
    expect($('#filter-ALL').textContent).toBe('All (2)');
  });

  it('keeps focus on the filter toggle after re-rendering', () => {
    $('#filter-DONE').focus();
    $('#filter-DONE').click();
    expect(document.activeElement?.id).toBe('filter-DONE');
  });

  it('shows an empty state for an empty view', () => {
    $('#filter-DONE').click();
    expect(root.querySelector('.tasks')).toBeNull();
    expect($('.empty').textContent).toBe('Nothing in this view.');
  });

  it('deletes a task and clears completed ones', () => {
    $('[aria-label=\'Delete "Review PR"\']').click();
    expect(titles()).toEqual(['Verify AST']);

    expect($<HTMLButtonElement>('#clear-completed').disabled).toBe(true);
    $('.task input[type="checkbox"]').click();
    $('#clear-completed').click();
    expect(titles()).toEqual([]);
    expect($('.empty').textContent).toBe('No tasks yet.');
  });

  it('renders user input as text (XSS)', () => {
    addViaForm('<img src=x onerror=alert(1)>');
    expect(root.querySelector('img')).toBeNull();
    expect(titles()).toContain('<img src=x onerror=alert(1)>');
  });

  it('stores state only in the external store, in hook order', () => {
    $('#filter-ACTIVE').click();
    const [tasks, filter] = inspectStateStore().states;
    expect((tasks as readonly Task[]).map((t) => t.title)).toEqual(['Review PR', 'Verify AST']);
    expect(filter).toBe('ACTIVE');
  });

  it('keeps the DOM in 1:1 parity with the VNode tree after every state change', () => {
    addViaForm('A');
    $('.task input[type="checkbox"]').click();
    $('#filter-DONE').click();
    expect(audits).toEqual([true, true, true, true]);
  });

  it('CHECKPOINT: zero orphan event listeners on button children after mutating state', () => {
    addViaForm('Audit listeners');
    $('.task input[type="checkbox"]').click();
    $('#filter-ACTIVE').click();
    $('#filter-ALL').click();

    // Only the root ever received listeners: exactly one per delegated event type.
    expect(addListener.mock.instances.every((target) => target === root)).toBe(true);
    expect(addListener.mock.calls.map(([type]) => type)).toEqual([...DELEGATED_EVENTS]);

    // Buttons carry virtual handlers in the registry, never real listeners or inline attributes.
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.getAttributeNames().some((name) => name.startsWith('on'))).toBe(false);
    }
    expect(buttons.filter((button) => getHandler(button, 'click') !== undefined).length).toBe(buttons.length - 1); // all except submit
  });
});
