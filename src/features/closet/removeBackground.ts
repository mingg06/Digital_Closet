// Background removal runs entirely in the browser. Only the model and runtime
// files are downloaded from the library's static host (once, then
// browser-cached); photos never leave the device. The library is loaded lazily
// so it stays out of the main bundle and the offline precache.
export async function removeBackground(source: Blob): Promise<Blob> {
  try {
    const { removeBackground: run } = await import('@imgly/background-removal')
    return await run(source, { output: { format: 'image/png' } })
  } catch (reason) {
    if (!navigator.onLine)
      throw new Error(
        'Removing the background needs a one-time download. Connect to the internet, or untick Remove background to keep the original photo.',
        { cause: reason },
      )
    throw new Error(
      "Couldn't remove the background. Try a clearer photo, or untick Remove background to keep the original.",
      { cause: reason },
    )
  }
}
