export function logError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${new Date().toISOString()}] ${context}: ${message}`);
}

export function logInfo(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}
