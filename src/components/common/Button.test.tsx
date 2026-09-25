import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.tsx';
import type { ButtonSize, ButtonVariant } from './Button.tsx';

/**
 * The button every action renders, and the promises its variants make.
 *
 * The primitive exists so that a variant's look is written once (issue #390), so what is worth
 * asserting is what a call site relies on without restating: that it is a real button which never
 * submits a form by accident, that everything `ControlTooltip` and a caller hang on it reaches the
 * element, that a disabled one refuses the press, and that the variants stay distinct in the ways
 * their names promise.
 */

/** Every variant and size, checked by the compiler to be the whole union and nothing more. */
const VARIANTS = Object.values({
  primary: 'primary',
  view: 'view',
  secondary: 'secondary',
  danger: 'danger',
  destructive: 'destructive',
  quiet: 'quiet',
} as const satisfies { readonly [Variant in ButtonVariant]: Variant });

const SIZES = Object.values({ sm: 'sm', md: 'md', lg: 'lg', icon: 'icon' } as const satisfies {
  readonly [Size in ButtonSize]: Size;
});

/** How many buttons `rendered` has drawn, so that no two in one test share a name. */
let drawn = 0;

/** Renders one button and returns it. */
function rendered(variant: ButtonVariant, size?: ButtonSize): HTMLButtonElement {
  drawn += 1;
  const name = `${variant}-${size ?? 'default'}-${String(drawn)}`;
  render(
    <Button variant={variant} {...(size === undefined ? {} : { size })}>
      {name}
    </Button>,
  );
  return screen.getByRole<HTMLButtonElement>('button', { name });
}

describe('Button', () => {
  it('is a plain button unless asked to submit', () => {
    render(
      <form>
        <Button variant="secondary">Plain</Button>
        <Button variant="view" type="submit">
          Send
        </Button>
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('passes through what a caller and ControlTooltip hang on it', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <Button variant="secondary" ref={ref} aria-describedby="card" aria-expanded={false} onClick={onClick}>
        Toggle
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Toggle' });

    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute('aria-describedby', 'card');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('refuses the press while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives every variant a disabled treatment of its own', () => {
    // A disabled button still matches `:hover`, so each variant must name what it looks like while
    // disabled rather than keep its resting colours. `view`'s treatment is the `action-tab` utility's
    // own `:disabled` rule, which `tests/design-tokens.test.ts` reads out of the stylesheet.
    for (const variant of VARIANTS) {
      const classes = rendered(variant).className;
      expect(classes, variant).toMatch(/\bdisabled:cursor-not-allowed\b/);
      expect(classes, variant).toMatch(
        variant === 'view' ? /\baction-tab\b/ : /\bdisabled:(?:hover:)?(?:bg|text|border|opacity|shadow)-/,
      );
    }
  });

  it('puts foundry ink on the two solid role fills, and the view colour on the view variant', () => {
    expect(rendered('primary').className).toMatch(/\bbg-accent-strong\b.*\btext-foundry-950\b/);
    expect(rendered('destructive').className).toMatch(/\bbg-rose\b.*\btext-foundry-950\b/);
    expect(rendered('danger').className).toMatch(/\btext-rose\b/);
    expect(rendered('view').className).toMatch(/\baction-tab\b/);
  });

  it('keeps every variant and size distinct, with md the default size', () => {
    const variantClasses = VARIANTS.map((variant) => rendered(variant, 'sm').className);
    const sizeClasses = SIZES.map((size) => rendered('secondary', size).className);

    expect(new Set(variantClasses).size).toBe(VARIANTS.length);
    expect(new Set(sizeClasses).size).toBe(SIZES.length);
    expect(rendered('quiet').className).toBe(rendered('quiet', 'md').className);
  });

  it('adds a call site’s placement after its own classes', () => {
    render(
      <Button variant="secondary" className="w-full">
        Wide
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Wide' }).className).toMatch(/ w-full$/);
  });
});
