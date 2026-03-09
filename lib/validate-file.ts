export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate file type and size before upload. Returns `{valid: true}` or an error key. */
export function validateUploadFile(file: File): FileValidationResult {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return { valid: false, error: "unsupportedType" };
  }
  const maxSize =
    file.type === "text/plain"
      ? 500 * 1024
      : file.type.startsWith("application/vnd")
        ? 10 * 1024 * 1024
        : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: "fileTooLarge" };
  }
  return { valid: true };
}
