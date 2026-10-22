import { api } from '@/shared/api';

export const SHELL_UPLOAD_MAX_FILES = 10;
export const SHELL_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
/** Fired on the terminal container when the Cmd/Ctrl+V handler finds clipboard files. */
export const SHELL_PASTE_FILES_EVENT = 'cloudcli:shell-paste-files';

/** POSIX single-quote escaping so any path is safe to drop on a shell / CLI prompt. */
export const quoteShellPath = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const extensionForMime = (mime: string): string => {
  const sub = mime.split('/')[1]?.split(/[+;]/)[0];
  if (!sub) return 'bin';
  return sub === 'jpeg' ? 'jpg' : sub;
};

/** Clipboard images often arrive unnamed ("image.png" or ""); give them a stable name. */
export const ensureNamedFile = (file: File | Blob, index = 0): File => {
  const name = file instanceof File ? file.name : '';
  if (name && name !== 'image.png') return file as File;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const type = file.type || 'application/octet-stream';
  return new File([file], `pasted-${stamp}${index ? `-${index}` : ''}.${extensionForMime(type)}`, { type });
};

export class ShellUploadError extends Error {}

/**
 * Uploads files through the authenticated assets route (~/.cloudcli/assets)
 * and returns their quoted absolute paths joined by spaces plus a trailing
 * space, ready to be typed into the terminal (never followed by Enter).
 */
export async function uploadFilesForShell(files: File[]): Promise<string> {
  if (files.length === 0) return '';
  if (files.length > SHELL_UPLOAD_MAX_FILES) {
    throw new ShellUploadError(`最多一次上传 ${SHELL_UPLOAD_MAX_FILES} 个文件`);
  }
  const tooLarge = files.find((file) => file.size > SHELL_UPLOAD_MAX_BYTES);
  if (tooLarge) {
    throw new ShellUploadError(`${tooLarge.name} 超过 10 MB`);
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await api.assets.uploadFiles(formData);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ShellUploadError(body?.error || `上传失败 (${response.status})`);
  }
  const result = await response.json();
  const paths: string[] = Array.isArray(result?.attachments)
    ? result.attachments.map((a: { path?: unknown }) => (typeof a?.path === 'string' ? a.path : '')).filter(Boolean)
    : [];
  if (paths.length !== files.length) {
    throw new ShellUploadError('上传结果不完整');
  }
  return `${paths.map(quoteShellPath).join(' ')} `;
}
