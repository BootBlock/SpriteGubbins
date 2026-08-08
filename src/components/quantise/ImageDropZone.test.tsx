import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImageDropZone } from './ImageDropZone.tsx';

function show(currentName: string | null) {
  const onClear = vi.fn();
  render(<ImageDropZone acceptFile={vi.fn()} currentName={currentName} onClear={onClear} />);
  return onClear;
}

describe('ImageDropZone', () => {
  it('offers no way out before there is anything to clear', () => {
    show(null);

    expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull();
  });

  it('clears the sheet it is showing the name of', () => {
    const onClear = show('returned-sheet.png');

    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});
