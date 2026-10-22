import type { AppTab } from '@/shared/types';

/**
 * Local (fork `mine`) workspace defaults. Kept in its own file so upstream
 * merges only touch the one-line imports in the files that use it.
 */
export const DEFAULT_TAB: AppTab = 'shell';

/** Set to true to bring the Chat tab back in the workspace tab bar. */
export const SHOW_CHAT_TAB = false;
