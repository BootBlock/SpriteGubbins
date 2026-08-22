import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../constants/promptText/index.ts';
import { DEFAULT_MODE_FOR } from '../constants/sheetPlans/index.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';

/**
 * The subject store's one piece of real logic is that a category and its answers move together —
 * every route into the store either sets both or leaves the category alone. A subject holding
 * another category's values is the failure this file exists to catch.
 */

beforeEach(() => {
  useSubjectStore.setState({
    category: DEFAULT_PRESET.category,
    subject: DEFAULT_PRESET.subject,
  });
});

afterEach(() => {
  // Restores `Math.random` where a test pinned it.
  vi.restoreAllMocks();
});

describe('useSubjectStore', () => {
  it('opens on the default preset', () => {
    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe(DEFAULT_PRESET.category);
    expect(subject).toEqual(DEFAULT_PRESET.subject);
  });

  it('replaces the whole subject when the category changes', () => {
    useSubjectStore.getState().setCategory('BUILDING');

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('BUILDING');
    expect(subject).toEqual(defaultSubjectFor('BUILDING'));
    // Specifically not carrying the character's answers over into a building's fields.
    expect(subject.species).not.toBe(DEFAULT_PRESET.subject.species);
  });

  it('sets one field without disturbing the others', () => {
    useSubjectStore.getState().setField('role', 'Bartender');

    const { subject } = useSubjectStore.getState();
    expect(subject.role).toBe('Bartender');
    expect(subject.species).toBe(DEFAULT_PRESET.subject.species);
  });

  it('accepts a value that is not in the field pool', () => {
    // The combo box is unfiltered by design — the pool suggests, it does not constrain.
    useSubjectStore.getState().setField('species', 'Sentient Filing Cabinet');
    expect(useSubjectStore.getState().subject.species).toBe('Sentient Filing Cabinet');
  });

  it('randomises every field to the top of its pool when the draw is high', () => {
    useSubjectStore.getState().setCategory('CREATURE');

    // `Math.random` is pinned so the expected result is exact rather than merely plausible. A high
    // draw selects each pool's *last* option, which is not the value the field already holds — the
    // category's defaults are every pool's *first* option — so a `randomizeSubject` that quietly
    // did nothing, or whose `undefined` guard never let an assignment through, fails here.
    // Asserting pool *membership* instead would not: the defaults are in the pool too.
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    useSubjectStore.getState().randomizeSubject();

    const { subject } = useSubjectStore.getState();
    expect(Object.keys(subject).sort()).toEqual([...SUBJECT_FIELD_KEYS].sort());
    for (const field of CATEGORY_OPTIONS.CREATURE.fields) {
      expect(subject[field.key]).toBe(field.options.at(-1));
    }
  });

  it('randomises every field to the bottom of its pool when the draw is low', () => {
    useSubjectStore.getState().setCategory('ITEM');

    // The other end of the index arithmetic: `Math.floor(0 * length)` must land on the first
    // option, never below it.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSubjectStore.getState().randomizeSubject();

    const { subject } = useSubjectStore.getState();
    for (const field of CATEGORY_OPTIONS.ITEM.fields) {
      expect(subject[field.key]).toBe(field.options[0]);
    }
  });

  it('randomising does not change the category', () => {
    useSubjectStore.getState().setCategory('ITEM');
    useSubjectStore.getState().randomizeSubject();
    expect(useSubjectStore.getState().category).toBe('ITEM');
  });

  it('resets to the current category defaults, not the boot category', () => {
    useSubjectStore.getState().setCategory('OBJECT');
    useSubjectStore.getState().setField('role', 'Something else');
    useSubjectStore.getState().resetSubject();

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('OBJECT');
    expect(subject).toEqual(defaultSubjectFor('OBJECT'));
  });

  it('sets a category and subject together', () => {
    const creature = defaultSubjectFor('CREATURE');
    useSubjectStore.getState().setSubject('CREATURE', creature);

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('CREATURE');
    expect(subject).toEqual(creature);
  });

  /**
   * State leakage across a category change — the interactive half of the contamination defect.
   *
   * The sheet mode lives in the *output* store and the category in this one, so nothing used to
   * reconcile them: configure a building tileset, switch to CHARACTER, and the store still held
   * `TILESET_MODULAR`. The compiler resolves that pairing now, so the prompt was never the risk —
   * but a preset saved in that state would have persisted a mode its own category cannot produce.
   */
  describe('the sheet mode when the category changes', () => {
    it('drops a mode the new category cannot produce', () => {
      useOutputStore.setState({
        output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'TILESET_MODULAR' },
      });
      useSubjectStore.getState().setCategory('BUILDING');
      expect(useOutputStore.getState().output.directionalMode).toBe('TILESET_MODULAR');

      useSubjectStore.getState().setCategory('CHARACTER');

      expect(useOutputStore.getState().output.directionalMode).toBe(DEFAULT_MODE_FOR.CHARACTER);
      expect(useOutputStore.getState().output.directionalMode).not.toBe('TILESET_MODULAR');
    });

    it('keeps a mode the new category shares, rather than resetting for its own sake', () => {
      // CHARACTER → CREATURE should not silently discard a cut-out rig the user chose.
      useOutputStore.setState({
        output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' },
      });
      useSubjectStore.getState().setCategory('CREATURE');

      expect(useOutputStore.getState().output.directionalMode).toBe('CUTOUT_RIG_SINGLE_DIRECTION');
    });

    it('drops a humanoid mode when moving to a category with no limbs', () => {
      // The reverse direction, and the one that was broken by default: ITEM has no cut-out rig.
      useOutputStore.setState({
        output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' },
      });
      useSubjectStore.getState().setCategory('ITEM');

      expect(useOutputStore.getState().output.directionalMode).toBe(DEFAULT_MODE_FOR.ITEM);
    });
  });

  /**
   * The same leak, one control down — and the one that shipped in the state the app *opens* in.
   *
   * `rigMode` was not reconciled at all, so a cut-out rig configured on a character survived a switch
   * to BUILDING and put section 5's bone axes and joint caps on a sheet of floor tiles. It matters
   * for the same reason the sheet mode does and no more: the compiler resolves the pairing on every
   * compile, so the prompt was never the risk — a preset saved in that state was.
   */
  describe('the rig when the category changes', () => {
    it('drops a rig the new category has no joints for', () => {
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, rigMode: 'CUTOUT_RIG' } });
      useSubjectStore.getState().setCategory('BUILDING');

      expect(useOutputStore.getState().output.rigMode).toBe('NONE');
    });

    it('keeps a rig the new category shares, rather than resetting for its own sake', () => {
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, rigMode: 'CUTOUT_RIG' } });
      useSubjectStore.getState().setCategory('CREATURE');

      expect(useOutputStore.getState().output.rigMode).toBe('CUTOUT_RIG');
    });

    it('does not put a rig back when the category could take one', () => {
      // `NONE` is a choice, not an absence: switching from a tileset to a character must not hand
      // the user articulation rules they never asked for. The fallback only ever removes.
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, rigMode: 'NONE' } });
      useSubjectStore.getState().setCategory('CHARACTER');

      expect(useOutputStore.getState().output.rigMode).toBe('NONE');
    });

    it('reconciles the sheet mode and the rig in one write', () => {
      // Two `setOutputConfig` calls would put a resolved mode beside an unresolved rig into the
      // compiler between renders, which is the reason the sheet index travels here too.
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
          rigMode: 'CUTOUT_RIG',
          sheetIndex: 1,
        },
      });
      useSubjectStore.getState().setCategory('INTERFACE');

      const { output } = useOutputStore.getState();
      expect(output.directionalMode).toBe(DEFAULT_MODE_FOR.INTERFACE);
      expect(output.rigMode).toBe('NONE');
      expect(output.sheetIndex).toBe(0);
    });
  });

  /**
   * The third leak, and the one that was visible from a default session in one click.
   *
   * `directions` was not reconciled at all, so `THREE_CLASSIC` — the set the app opens on — survived
   * a switch to INTERFACE or TERRAIN. Neither subject has a front to turn away from, so the studio
   * offered "Split into 3 sheets" and the first run asked for a button, and for a flat ground tile,
   * at object yaw 45°. It matters here for the same reason the two above do: the compiler resolves
   * the set on every compile, so what was at risk was a preset saved in that state.
   */
  describe('the direction set when the category changes', () => {
    it('drops a set the new subject has no facing for', () => {
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, directions: 'THREE_CLASSIC' } });
      useSubjectStore.getState().setCategory('INTERFACE');

      expect(useOutputStore.getState().output.directions).toBe('SINGLE_FRONT');
    });

    it('keeps a set the new subject can be turned to, rather than resetting for its own sake', () => {
      // Seven of the nine categories can be turned to all five, so this is most switches — and an
      // EFFECT is the one worth naming: a directional slash genuinely is eight runs.
      useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, directions: 'EIGHT_COMPASS' } });
      useSubjectStore.getState().setCategory('EFFECT');

      expect(useOutputStore.getState().output.directions).toBe('EIGHT_COMPASS');
    });

    it('clears the pinned facing with the set, and only when the set actually moves', () => {
      // A facing is only valid against its own set, so one held over from `THREE_CLASSIC` is a yaw
      // `SINGLE_FRONT` never turns to — which a preset saved from here would carry.
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          directions: 'THREE_CLASSIC',
          primaryDirection: 'front-three-quarter',
        },
      });
      useSubjectStore.getState().setCategory('TERRAIN');
      expect(useOutputStore.getState().output.primaryDirection).toBeNull();

      // And left alone where the set survives: the facing is still one of its own, so clearing it
      // would silently move a split batch back to run one.
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          directions: 'EIGHT_COMPASS',
          primaryDirection: 'north-west',
        },
      });
      useSubjectStore.getState().setCategory('CREATURE');
      expect(useOutputStore.getState().output.primaryDirection).toBe('north-west');
    });
  });

  /**
   * The fourth leak, and the only one that put a self-contradicting prompt on screen.
   *
   * `projection` was not reconciled at all, so `THREE_QUARTER_TOPDOWN` — the camera the app opens on
   * — survived a switch to INTERFACE, and section 3 compiled `Angled overhead … the vertical screen
   * axis carries both height and depth` and `Camera elevation: 35° above the horizon` above an
   * inventory of button states, a panel frame and a cursor. The other three leaks produced a
   * degenerate prompt; this one produced a prompt arguing with itself.
   *
   * The elevation is reconciled with it, because the two are one statement about one camera.
   */
  describe('the projection when the category changes', () => {
    it('drops a camera the new subject has no geometry for, and the elevation with it', () => {
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          projection: 'THREE_QUARTER_TOPDOWN',
          cameraElevation: 35,
        },
      });
      useSubjectStore.getState().setCategory('INTERFACE');

      const { output } = useOutputStore.getState();
      expect(output.projection).toBe('ORTHOGRAPHIC_FRONT');
      // Not merely narrowed — 35° beside a flat front elevation is the disagreement the projection
      // and the elevation are resolved together to prevent.
      expect(output.cameraElevation).toBe(DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT);
    });

    it('keeps a camera the new subject can be drawn under, rather than resetting for its own sake', () => {
      // Eight of the nine categories are offered every projection, so this is most switches — and
      // TERRAIN is the one worth naming: a cliff face is a landform seen from the side, which is
      // what the `side-on-volcanic-cliff` preset draws.
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          projection: 'ORTHOGRAPHIC_SIDE',
          cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
        },
      });
      useSubjectStore.getState().setCategory('TERRAIN');

      const { output } = useOutputStore.getState();
      expect(output.projection).toBe('ORTHOGRAPHIC_SIDE');
      expect(output.cameraElevation).toBe(DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE);
    });

    it('keeps a chosen elevation the surviving camera still leaves open', () => {
      // The fallback only ever narrows. `THREE_QUARTER_TOPDOWN` spans 1–89°, so a reader who set 60°
      // on a character keeps it on a creature — resetting to the projection's default would discard
      // a deliberate choice for nothing.
      useOutputStore.setState({
        output: { ...DEFAULT_OUTPUT_CONFIG, projection: 'THREE_QUARTER_TOPDOWN', cameraElevation: 60 },
      });
      useSubjectStore.getState().setCategory('CREATURE');

      expect(useOutputStore.getState().output.cameraElevation).toBe(60);
    });

    it('drops an art style reference the new subject cannot be drawn to match', () => {
      // The projection's second door. A reference states the camera it was rendered under and
      // carries it into section 2 as a measurement — “a tile edge runs two pixels sideways for every
      // one it drops” is the 30° dimetric camera — so leaving it behind puts that measurement above
      // a flat front elevation, and a preset saved from here would persist the pair.
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          styleReference: 'DIABLO_II',
          projection: 'DIMETRIC_2_1',
          cameraElevation: 30,
        },
      });
      useSubjectStore.getState().setCategory('INTERFACE');

      expect(useOutputStore.getState().output.styleReference).toBe('NONE');
    });

    it('keeps a reference the new subject can be drawn to match', () => {
      useOutputStore.setState({
        output: {
          ...DEFAULT_OUTPUT_CONFIG,
          styleReference: 'DIABLO_II',
          projection: 'DIMETRIC_2_1',
          cameraElevation: 30,
        },
      });
      useSubjectStore.getState().setCategory('TERRAIN');

      expect(useOutputStore.getState().output.styleReference).toBe('DIABLO_II');
    });
  });
});
