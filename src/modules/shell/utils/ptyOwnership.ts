// mine: sockets that are only viewing a shared PTY (another device owns its size).
// A viewer must not fit/resize; it renders at the PTY's current cols/rows.
export const viewerSockets = new WeakSet<object>();
