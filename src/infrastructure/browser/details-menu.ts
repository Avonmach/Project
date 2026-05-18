export function closeOpenDetailsMenusOutsideTarget(selector: string, target: Node): void {
  for (const menu of document.querySelectorAll<HTMLDetailsElement>(selector)) {
    if (!menu.contains(target)) menu.open = false;
  }
}
