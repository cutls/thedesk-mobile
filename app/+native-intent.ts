
export async function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    // Check if the URL is from the share extension/intent
    if (new URL(path).hostname === 'expo-sharing') {
      return '/handleShare';
    }
    return path;
  } catch {
    // Fallback to the root path on error
    return '/';
  }
}
