export function cloudAnchorError(cause: unknown, action: 'save' | 'restore'): string {
  const value = cause as { state?: string; error?: string; message?: string } | null;
  const state = value?.state;
  const message = value?.error || value?.message || '';
  if (state === 'ErrorNotAuthorized') return 'The anchor service rejected this app’s credentials.';
  if (state === 'ErrorResourceExhausted') return 'The anchor service usage limit has been reached.';
  if (state === 'ErrorHostingDatasetProcessingFailed' || /insufficient|feature|observed|dataset/i.test(message)) return 'Scan more of the textured surroundings, then try saving again.';
  if (state === 'ErrorCloudIdNotFound') return action === 'save' ? 'This surface is no longer tracked. Place the tile again before saving.' : 'The saved anchor could not be found. It may have expired.';
  if (/session not available|view not initialized|unmounted/i.test(message)) return 'AR tracking is not ready. Scan the surroundings and retry.';
  if (state === 'ErrorHostingServiceUnavailable' || /network|offline|internet|connection|timeout/i.test(message)) return 'The anchor service could not be reached. Check your internet connection and retry.';
  if (state === 'ErrorResolvingSdkVersionTooOld' || state === 'ErrorResolvingSdkVersionTooNew') return 'The saved anchor needs a compatible version of the AR app.';
  return action === 'save' ? 'The exact position was not saved. Scan more of the surroundings and retry.' : 'The saved position could not be restored. Scan the original surroundings and retry.';
}
