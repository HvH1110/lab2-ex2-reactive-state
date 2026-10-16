import { createElement, useState, type VNode } from './mini-react';

// ---------------------------------------------------------------------------
// Domain model + pure state transitions (never mutate, always return new arrays)
// ---------------------------------------------------------------------------

export type Filter = 'ALL' | 'ACTIVE' | 'DONE';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
}

export const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DONE', label: 'Done' },
];

let lastId = 0;
export const createTask = (title: string): Task => ({ id: `t${++lastId}`, title, done: false });

export const addTask = (tasks: readonly Task[], title: string): readonly Task[] => [...tasks, createTask(title)];

export const toggleTask = (tasks: readonly Task[], id: string): readonly Task[] =>
  tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));

export const removeTask = (tasks: readonly Task[], id: string): readonly Task[] => tasks.filter((task) => task.id !== id);

export const clearCompleted = (tasks: readonly Task[]): readonly Task[] => tasks.filter((task) => !task.done);

export const filterTasks = (tasks: readonly Task[], filter: Filter): readonly Task[] =>
  filter === 'ALL' ? tasks : tasks.filter((task) => (filter === 'DONE' ? task.done : !task.done));

/** Created once: useState only reads its initial value on the first render. */
const INITIAL_TASKS: readonly Task[] = Object.freeze(['Review PR', 'Verify AST'].map(createTask));

// ---------------------------------------------------------------------------
// Pure view components: data comes down as props, changes go up via callbacks
// ---------------------------------------------------------------------------

interface Counts {
  readonly ALL: number;
  readonly ACTIVE: number;
  readonly DONE: number;
}

function TaskForm({ onAdd }: { readonly onAdd: (title: string) => void }): VNode {
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    // Delegation: currentTarget is the root, so read the form from event.target.
    if (!(event.target instanceof HTMLFormElement)) return;
    const title = String(new FormData(event.target).get('title') ?? '').trim();
    if (title !== '') onAdd(title);
  };

  return createElement('form', { className: 'task-form', 'aria-label': 'Add task', onSubmit },
    createElement('label', { htmlFor: 'new-task' }, 'New task'),
    createElement('input', {
      id: 'new-task', name: 'title', type: 'text', required: true, maxlength: 120, autocomplete: 'off',
      placeholder: 'What needs doing?',
    }),
    createElement('button', { id: 'add-task', type: 'submit', className: 'btn' }, 'Add Task'),
  );
}

function FilterBar({ filter, counts, onChange }: {
  readonly filter: Filter;
  readonly counts: Counts;
  readonly onChange: (filter: Filter) => void;
}): VNode {
  return createElement('fieldset', { className: 'filters' },
    createElement('legend', null, 'Show'),
    FILTERS.map(({ value, label }) =>
      createElement('button', {
        key: value,
        id: `filter-${value}`,
        type: 'button',
        className: 'chip',
        'aria-pressed': String(value === filter),
        onClick: () => onChange(value),
      }, `${label} (${counts[value]})`),
    ),
  );
}

function TaskItem({ task, onToggle, onDelete }: {
  readonly task: Task;
  readonly onToggle: (id: string) => void;
  readonly onDelete: (id: string) => void;
}): VNode {
  return createElement('li', { key: task.id, className: task.done ? 'task task--done' : 'task' },
    createElement('label', { className: 'task__label' },
      createElement('input', {
        id: `toggle-${task.id}`, type: 'checkbox', checked: task.done, onChange: () => onToggle(task.id),
      }),
      task.title,
    ),
    createElement('button', {
      id: `delete-${task.id}`, type: 'button', className: 'btn btn--ghost',
      'aria-label': `Delete "${task.title}"`, onClick: () => onDelete(task.id),
    }, 'Delete'),
  );
}

function TaskList({ tasks, filter, onToggle, onDelete }: {
  readonly tasks: readonly Task[];
  readonly filter: Filter;
  readonly onToggle: (id: string) => void;
  readonly onDelete: (id: string) => void;
}): VNode {
  if (tasks.length === 0) {
    return createElement('p', { className: 'empty' }, filter === 'ALL' ? 'No tasks yet.' : 'Nothing in this view.');
  }
  return createElement('ul', { className: 'tasks' }, tasks.map((task) => TaskItem({ task, onToggle, onDelete })));
}

// ---------------------------------------------------------------------------
// Root component: the only place that owns state
// ---------------------------------------------------------------------------

export function TaskApp(): VNode {
  const [tasks, setTasks] = useState<readonly Task[]>(INITIAL_TASKS);
  const [filter, setFilter] = useState<Filter>('ALL');

  // Derived during render, never stored in state.
  const counts: Counts = {
    ALL: tasks.length,
    ACTIVE: tasks.filter((task) => !task.done).length,
    DONE: tasks.filter((task) => task.done).length,
  };
  const visible = filterTasks(tasks, filter);

  return createElement('main', { className: 'app-container' },
    createElement('header', { className: 'hero' },
      createElement('h1', null, 'Task Manager'),
      createElement('p', { className: 'summary', 'aria-live': 'polite' },
        `Tasks: ${counts.ALL} · Active: ${counts.ACTIVE} · Done: ${counts.DONE}`),
    ),
    TaskForm({ onAdd: (title) => setTasks((prev) => addTask(prev, title)) }),
    createElement('section', { className: 'panel', 'aria-labelledby': 'list-title' },
      createElement('h2', { id: 'list-title' }, 'Tasks'),
      FilterBar({ filter, counts, onChange: setFilter }),
      TaskList({
        tasks: visible,
        filter,
        onToggle: (id) => setTasks((prev) => toggleTask(prev, id)),
        onDelete: (id) => setTasks((prev) => removeTask(prev, id)),
      }),
    ),
    createElement('footer', { className: 'footer' },
      createElement('button', {
        id: 'clear-completed', type: 'button', className: 'btn btn--ghost', disabled: counts.DONE === 0,
        onClick: () => setTasks(clearCompleted),
      }, 'Clear completed'),
    ),
  );
}
