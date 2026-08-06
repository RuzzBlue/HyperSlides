/**
 * Browsers do not execute <script> tags inserted via element.innerHTML.
 * Re-insert each script as a fresh node so classic inline / src scripts run.
 * During execution, document.currentScript is set (needed by many paste-in widgets).
 */
export function runInlineScripts(root: ParentNode): void {
  const scripts = Array.from(root.querySelectorAll('script'));
  for (const old of scripts) {
    const neu = document.createElement('script');
    for (const { name, value } of Array.from(old.attributes)) {
      neu.setAttribute(name, value);
    }
    neu.textContent = old.textContent;
    old.replaceWith(neu);
  }
}
