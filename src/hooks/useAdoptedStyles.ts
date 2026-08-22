import { useLayoutEffect } from 'react';

/**
 * Carry this document's whole stylesheet into another one, and keep it there.
 *
 * A window opened with `window.open` or `requestWindow` starts as an empty document that inherits
 * **none** of the opener's CSS, so a React subtree portalled into it renders as unstyled markup.
 * Every class the app writes — the foundry ramp, the glass panels, the pane geometry — has to be put
 * there deliberately.
 *
 * **It reads `document.styleSheets` rather than the elements that produced them**, and that is what
 * makes one mechanism cover both builds. Vite's dev server injects a `<style>` element per module
 * and the production bundle emits a `<link>` to one hashed file, so a copy written against either
 * shape works in that build and silently produces an unstyled window in the other — which is a
 * defect nobody sees until the app is deployed. The stylesheet list is the same list either way.
 *
 * **The rules are inlined rather than the `<link>` cloned**, because a cloned link is fetched again:
 * the new document would paint the preview unstyled for as long as that took, on the one surface
 * whose entire job is showing artwork accurately. Every sheet here is same-origin — the app loads no
 * other kind, and cannot under COEP `require-corp` — so `cssRules` is readable and already parsed.
 *
 * A layout effect, so the rules land in the same commit that mounts the portal's children and before
 * the browser has a chance to paint either window. Nothing about the copy is React's to re-render.
 */
export function useAdoptedStyles(target: Document | null): void {
  useLayoutEffect(() => {
    if (target === null) return;

    const carried = target.createElement('style');
    target.head.append(carried);
    const copy = () => {
      carried.textContent = styleSheetTextOf(document);
    };
    copy();

    // The dev server replaces the text of its injected `<style>` elements on every hot update, and
    // adds one for each module that gains styles. Neither touches this document, so without an
    // observer the detached window keeps whatever CSS it opened with — stale from the first edit
    // anyone makes to `index.css` with the preview detached. The production bundle's single `<link>`
    // never changes, so this costs nothing there.
    const observer = new MutationObserver(copy);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      carried.remove();
    };
  }, [target]);
}

/**
 * Every rule the given document has, as one block of CSS text.
 *
 * A sheet whose rules cannot be read is skipped rather than thrown over. The app itself loads only
 * same-origin CSS, so its own sheets are always readable; a browser extension injecting a
 * cross-origin one is what this is for, and the alternative is a `SecurityError` raised inside a
 * layout effect, which — with no error boundary above these components — unmounts the whole app.
 *
 * A sheet's `media` is an attribute rather than part of its text, so it is re-applied as a wrapping
 * `@media` block instead of being dropped on the way across.
 */
function styleSheetTextOf(source: Document): string {
  const blocks: string[] = [];

  for (const sheet of source.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin, and not ours — see above.
      continue;
    }
    const css = Array.from(rules, (rule) => rule.cssText).join('\n');
    blocks.push(sheet.media.mediaText === '' ? css : `@media ${sheet.media.mediaText} {\n${css}\n}`);
  }

  return blocks.join('\n');
}
