import { SAVED_WORK_SURVIVES_A_RELOAD } from '../guidanceSentences.ts';

/**
 * Guidance for the shell’s own controls: the header’s four actions, the install offer and the update
 * notice.
 *
 * These are the controls reachable from every view, so each entry says what the control opens or
 * does, what it touches, and — for the three that touch nothing the generator ever sees — that it
 * does not reach the compiled prompt. That last part is the question a reader of a prompt tool
 * actually has: an action in the chrome looks like it might be part of the output.
 */
export const CHROME_TOOLTIPS = {
  atlasCalculator:
    'Opens the atlas planner. From this sheet’s component count, sheet shape and target component size, it answers three questions about the texture you pack the finished artwork into:\n\n' +
    '- how large each cell can be\n' +
    '- whether the component size the prompt requests fits that cell\n' +
    '- what the texture costs in graphics memory once uploaded\n\n' +
    'Nothing in it changes the prompt. It is the engine-side half of the job, for deciding how big a canvas to pack the returned sheet into.',

  history:
    'Opens the drawer of every prompt you have copied, newest first. Each entry keeps the studio state that produced it, so restoring one puts that configuration back into the studio.\n\n' +
    'You can also search, export as JSON or clear the whole history there. Prompts are recorded when you copy them and stored in this browser; nothing is sent anywhere.',

  copyPrompt:
    'Compiles the current configuration and puts the finished prompt on the clipboard, ready to paste into whichever generator the Target Model names. The prompt and the studio state behind it are recorded in the history.\n\n' +
    'It is the studio panel’s own Copy Prompt, repeated up here so it stays reachable from every view.',

  settings:
    'Opens the app’s own preferences: the hue of the primary action and focus ring, whether motion is quietened, whether the ambient wash behind the page is painted, and which view the app opens on. Every change applies as you make it.\n\n' +
    'None of it reaches the compiled prompt, so the same studio configuration gives the same text whatever is set here.',

  installApp:
    'Installs Sprite Gubbins as an application on this device, using the browser’s own install flow. You get a window of its own, a launcher entry and offline use, since the app has no server; the studio is the same either way.\n\n' +
    'Your prompt history and saved presets stay in this browser’s storage, where they already are.',

  reloadApp:
    'Fetches the app again from the beginning. This view’s code is fetched separately from the rest of the app and could not be loaded, and a failed fetch is remembered for the session, so pressing the tab again will not help.\n\n' +
    `Nothing you have saved is affected. ${SAVED_WORK_SURVIVES_A_RELOAD}`,

  startUpdate:
    `Starts the new version of Sprite Gubbins and reloads this tab onto it. ${SAVED_WORK_SURVIVES_A_RELOAD}\n\n` +
    'What is only on screen is cleared: a sheet in the Quantise tab, with its palette lock and sprite names, and every undo history. Other tabs keep the version they are running until you reload them.',

  reloadOntoUpdate:
    `Reloads this tab onto the version another tab started. ${SAVED_WORK_SURVIVES_A_RELOAD}\n\n` +
    'What is only on screen in this tab is cleared: a sheet in the Quantise tab, with its palette lock and sprite names, and every undo history. Until you reload, this tab goes on working on the version it started with.',

  dismissUpdate:
    'Takes this notice down, and this tab keeps the version it is running. The new version starts when you reload from this notice in any tab, or once every tab of Sprite Gubbins is closed and you open it again.',

  dismissInstall:
    'Takes this offer down for now without installing anything. Nothing is stored about the refusal, so the browser is free to offer again on a later visit, and the app is unchanged in the meantime.',
} as const;
