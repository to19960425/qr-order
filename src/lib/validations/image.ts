export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export type ImageValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateImageFile(file: { size: number; type: string }): ImageValidationResult {
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: '5MB以下のファイルを選択してください' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return { valid: false, error: 'JPEG, PNG, WebPのみ対応しています' };
  }
  return { valid: true };
}
