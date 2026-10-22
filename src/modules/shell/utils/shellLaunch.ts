import type { LLMProvider } from '@/shared/types';

/**
 * mine: launch choices for a NEW CLI session started from the Shell tab's
 * picker. Kept at module level (keyed per project + "new session" click) so
 * switching tabs and back reattaches to the same PTY instead of re-asking.
 */
export type ShellLaunch = { provider: LLMProvider; model: string; launchId: string };

const launches = new Map<string, ShellLaunch>();
let active: ShellLaunch | null = null;

export function getShellLaunch(key: string): ShellLaunch | null {
  return launches.get(key) ?? null;
}

export function setShellLaunch(key: string, launch: ShellLaunch): void {
  launches.set(key, launch);
}

/** Read by useShellConnection when it sends `init` for a session-less shell. */
export function getActiveShellLaunch(): ShellLaunch | null {
  return active;
}

export function setActiveShellLaunch(launch: ShellLaunch | null): void {
  active = launch;
}
