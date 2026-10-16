import './styles.css';
import { auditMount, inspectStateStore, renderApp } from './mini-react';
import { TaskApp } from './task-app';

const root = document.getElementById('app');
if (root === null) throw new Error('Mount target #app not found');

let commits = 0;

renderApp(TaskApp, root, {
  // Checkpoint verification after every state change, visible in the DevTools Console.
  onCommit: (tree, container) => {
    commits++;
    const report = auditMount(tree, container);
    console.assert(report.ok, 'VNode/DOM parity audit failed', report.issues);
    console.assert(container.querySelector('div, span') === null, 'div-soup detected');
    console.info(
      `[commit #${commits}] audit ${report.ok ? 'PASS' : 'FAIL'}: ${report.vnodeCount} VNodes ↔ ${report.domNodeCount} DOM nodes`,
      inspectStateStore().states,
    );
  },
});
