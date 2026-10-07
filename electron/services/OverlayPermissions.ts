import { desktopCapturer, systemPreferences } from 'electron';
let pending: Promise<{ microphone: string; screen: string }> | null = null;

/** Share concurrent requests so auto-start and the button cannot race OS prompts. */
export function prepareOverlayPermissions(): Promise<{ microphone: string; screen: string }> {
  if (process.platform !== 'darwin') return Promise.resolve({ microphone: 'granted', screen: 'granted' });
  if (pending) return pending;
  pending = (async () => {
    if (systemPreferences.getMediaAccessStatus('microphone') === 'not-determined') {
      await systemPreferences.askForMediaAccess('microphone');
    }
    if (!['granted', 'restricted'].includes(systemPreferences.getMediaAccessStatus('screen'))) {
      try { await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }); }
      catch (error) { console.warn('[Permissions] Screen permission request failed:', error); }
    }
    return { microphone: systemPreferences.getMediaAccessStatus('microphone'), screen: systemPreferences.getMediaAccessStatus('screen') };
  })().finally(() => { pending = null; });
  return pending;
}
