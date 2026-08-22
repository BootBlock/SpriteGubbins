/**
 * Guidance for the shell's own controls: the header's four actions, and the install offer.
 *
 * These are the controls reachable from every view, so each entry says what the control opens or
 * does, what it touches, and — for the three that touch nothing the generator ever sees — that it
 * does not reach the compiled prompt. That last part is the question a reader of a prompt tool
 * actually has: an action in the chrome looks like it might be part of the output.
 */
export const CHROME_TOOLTIPS = {
  atlasCalculator:
    'Opens the atlas planner. It takes the component count this sheet asks for, along with the sheet shape and target component size already set in the studio, and answers three questions about the texture the finished artwork gets packed into: how large each cell can be, whether the component size the prompt requests actually fits that cell, and what the texture costs in graphics memory once it is uploaded. Nothing in it changes the prompt — it is the engine-side half of the job, for deciding how big a canvas to pack the returned sheet into.',

  history:
    'Opens the drawer holding every prompt you have copied, newest first. Each entry keeps the studio state that produced it as well as the text, so restoring one puts that configuration back into the studio rather than leaving you to rebuild it from the prompt. It is also where the whole history is searched, exported as JSON, or cleared. Prompts are recorded at the moment you copy them, and the drawer is stored in this browser — nothing is sent anywhere.',

  copyPrompt:
    'Compiles the current configuration and puts the finished prompt on the clipboard, ready to paste into whichever generator the Target Model names. The prompt and the studio state behind it are recorded in the history at the same time. It is the same action as the studio panel’s own Copy Prompt, and it sits up here as well so it stays reachable from the foot of a long form and from every view.',

  settings:
    'Opens the app’s own preferences: which hue the primary action and focus ring take, whether the motion layer is quietened, whether the ambient wash behind the page is painted, and which view the app opens on. None of it reaches the compiled prompt, so two people with the same studio configuration get the same text whatever is set here. Every change applies as it is made.',

  installApp:
    'Installs Sprite Gubbins as an application on this device, using the browser’s own install flow. The studio is the same either way; what installing buys is a window of its own, a launcher entry, and offline use — the app carries no server, so with the files cached it works with no network at all. Your prompt history and saved presets stay in this browser’s storage, where they already are.',

  reloadApp:
    'Fetches the app again from the beginning. The view you were on could not be loaded — its code is fetched separately from the rest of the app, so a dropped connection at the wrong moment leaves that one view unable to start — and a failed fetch is remembered for the rest of the session, which is why pressing the tab again would not help. Nothing you have saved is affected: your prompt history, your presets and the studio state you were working on are all in this browser’s storage and are read back as the app starts.',

  dismissInstall:
    'Takes this offer down for now without installing anything. Nothing is stored about the refusal, so the browser is free to offer again on a later visit, and the app is unchanged in the meantime.',
} as const;
