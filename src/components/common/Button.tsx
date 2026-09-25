import type { ComponentPropsWithRef } from 'react';

/**
 * What a button is asking the reader to do, not what colour it is.
 *
 * `primary` is the app's fixed indigo, for an action that means the same wherever it appears: a
 * dialogue's closing action, a banner's offer, the error screen's reload. `view` wears
 * `--color-tab` through the `action-tab` utility, so it belongs to whatever set the property in
 * scope — the active view, or a preset card on its own stop — and is the primary action *inside* a
 * view. `secondary` is every other action. `danger` is a secondary that starts something destructive,
 * and `destructive` is the solid fill that confirms it, so the rose is spent twice by design: the
 * first press names the cost and the second pays it. `quiet` has no edge or fill until hovered, for
 * a glyph inside another control's box.
 */
export type ButtonVariant = 'primary' | 'view' | 'secondary' | 'danger' | 'destructive' | 'quiet';

/**
 * How much room the button takes: `sm` in a dense row or a confirmation pair, `md` for a panel's own
 * actions, `lg` for a dialogue's footer, and `icon` for a square glyph with an `aria-label`.
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Shared by every variant. A disabled button still matches `:hover` and `:active`, so each state is
 * put back where it started rather than left to re-light a control that cannot be pressed.
 */
const BASE = 'transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

/**
 * A solid-filled variant while disabled: the fill gives way to a control's ground, so the ink can
 * return. A string of its own, because the enabled state beside it is a role fill that no ink tone
 * may sit on, and `tests/design-tokens.test.ts` reads each class string as one state.
 */
const DISABLED_OFF_THE_FILL = 'disabled:bg-foundry-700 disabled:text-ink-faint disabled:shadow-none';

/** Text on a solid role fill takes `foundry-950`: no ink tone reaches 4.5:1 on one. */
const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary: `bg-accent-strong font-bold text-foundry-950 shadow-md hover:bg-accent ${DISABLED_OFF_THE_FILL}`,
  // The utility owns the fill, edge, shadow and the disabled treatment; see `index.css`.
  view: 'action-tab font-semibold',
  // The resting fill is not decoration: unfilled, a bordered run of sentence-case text is a weak
  // affordance, and the border alone carries too little contrast against a panel to mark a control.
  secondary:
    'border border-foundry-600 bg-foundry-700 font-semibold text-ink-muted hover:bg-foundry-600 hover:text-ink disabled:text-ink-faint disabled:hover:bg-foundry-700 disabled:hover:text-ink-faint',
  danger:
    'border border-foundry-600 bg-foundry-700 font-semibold text-rose hover:border-rose/50 hover:bg-foundry-600 disabled:text-ink-faint disabled:hover:border-foundry-600 disabled:hover:bg-foundry-700',
  destructive: `bg-rose font-bold text-foundry-950 hover:opacity-90 disabled:hover:opacity-100 ${DISABLED_OFF_THE_FILL}`,
  quiet:
    'font-semibold text-ink-faint hover:bg-foundry-700 hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-faint',
};

const SIZE_CLASSES: Readonly<Record<ButtonSize, string>> = {
  sm: 'rounded-lg px-2.5 py-1 text-xs',
  md: 'rounded-lg px-3.5 py-1.5 text-xs',
  lg: 'rounded-xl px-5 py-2.5 text-xs',
  icon: 'flex size-7 items-center justify-center rounded-lg text-sm',
};

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type' | 'className'> {
  readonly variant: ButtonVariant;
  readonly size?: ButtonSize;
  /** `submit` only inside a `<form>` whose `onSubmit` is the action; otherwise the default. */
  readonly type?: 'button' | 'submit';
  /**
   * Where the button sits and how its content is laid out — width, margin, flex, a `group` marker,
   * the monospace face, a glyph's motion. Never colour, edge, padding, radius, weight or size, which
   * belong to the variant and the size; `tests/button-primitive.test.ts` holds every call site to it.
   */
  readonly className?: string;
}

/**
 * The app's button. Every action button renders this, so a variant's hover, disabled treatment and
 * geometry are written once; `tests/button-primitive.test.ts` lists the few hand-styled `<button>`s
 * that remain and why each is not one of these.
 *
 * Everything else a `<button>` takes passes through, which is what lets `ControlTooltip` hang its
 * card on it through `aria-describedby` and a caller hold a `ref` to it.
 */
export function Button({ variant, size = 'md', type = 'button', className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={[BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(' ').trim()}
    />
  );
}
