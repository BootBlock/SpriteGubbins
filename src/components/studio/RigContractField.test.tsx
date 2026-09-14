import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { RigContractField } from './RigContractField.tsx';

/**
 * The one control that reads a file another program wrote.
 *
 * What is pinned here is the half a reader cannot recover from on their own: a file that will not
 * load has to say which part of it is wrong, and it must not take the loaded contract with it. A
 * mis-click on the wrong file would otherwise drop the rig and leave the sheet quietly back on the
 * inventory this app authors, with nothing on screen saying so.
 */

const CONTRACT = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'pelvis',
      pack_piece_name: 'pelvis',
      parent_slot: '',
      piece_size: { width: 20, height: 12 },
      piece_pivot: { x: 10, y: 6 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -48 },
    },
  ],
};

function fileOf(text: string): File {
  return new File([text], 'rig_contract.json', { type: 'application/json' });
}

async function choose(text: string): Promise<void> {
  await userEvent.upload(screen.getByLabelText('Rig Contract'), fileOf(text));
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('RigContractField', () => {
  it('loads a contract and says what the sheet now takes from it', async () => {
    render(<RigContractField appliesToSheet />);
    await choose(JSON.stringify(CONTRACT));

    await waitFor(() => {
      expect(useOutputStore.getState().output.rigContract?.skeleton_name).toBe('Humanoid');
    });
    // One piece, so the noun is singular: a summary reading “1 pieces” is the kind of thing a
    // test that only counted characters would have pinned as correct.
    expect(screen.getByText(/1 piece in a 48 × 96 frame/)).toBeTruthy();
  });

  it('says why a file was refused, and keeps the contract already loaded', async () => {
    render(<RigContractField appliesToSheet />);
    await choose(JSON.stringify(CONTRACT));
    await waitFor(() => {
      expect(useOutputStore.getState().output.rigContract).not.toBeNull();
    });

    await choose(JSON.stringify({ ...CONTRACT, format: 'sprite-pack-manifest' }));

    expect(await screen.findByText(/sprite-pack-manifest/)).toBeTruthy();
    expect(useOutputStore.getState().output.rigContract?.skeleton_name).toBe('Humanoid');
  });

  it('keeps the refusal live region in the document before there is anything to announce', () => {
    // A region inserted with its first message is not announced, which is the whole of what it is
    // for. Rendered empty, it is already there when the refusal arrives.
    const { container } = render(<RigContractField appliesToSheet />);

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('says so when the file is not JSON at all, rather than failing silently', async () => {
    // The one failure that throws rather than returning a refusal, and the reader cannot tell the
    // two apart: both are a file that is not a rig contract.
    render(<RigContractField appliesToSheet />);
    await choose('{ not json');

    expect(await screen.findByText(/could not be read as JSON/)).toBeTruthy();
  });

  it('gives the sheet back its own inventory when the contract is removed', async () => {
    render(<RigContractField appliesToSheet />);
    await choose(JSON.stringify(CONTRACT));
    await waitFor(() => {
      expect(useOutputStore.getState().output.rigContract).not.toBeNull();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(useOutputStore.getState().output.rigContract).toBeNull();
  });

  it('says the contract is not reaching a sheet that draws no rig pieces', async () => {
    // Carried by the whole configuration, read by one sheet of it. Without this the summary reads
    // as a promise that the sizes below are in the prompt, on a sheet whose inventory has no pieces.
    render(<RigContractField appliesToSheet={false} />);
    await choose(JSON.stringify(CONTRACT));

    expect(await screen.findByText(/This sheet does not draw the rig’s pieces/)).toBeTruthy();
  });
});
