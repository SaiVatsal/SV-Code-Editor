import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function invokeSafe<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`Tauri IPC invoke '${cmd}' error/fallback:`, err);
    throw err;
  }
}

export async function listenSafe<T>(
  event: string,
  handler: (payload: T) => void
): Promise<UnlistenFn> {
  try {
    return await listen<T>(event, (evt) => handler(evt.payload));
  } catch (err) {
    console.warn(`Tauri listen '${event}' error/fallback:`, err);
    return () => {};
  }
}

