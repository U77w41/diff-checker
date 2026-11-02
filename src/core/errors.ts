export type DiffErrorCode =
  'BINARY' | 'INVALID_JSON' | 'UNSUPPORTED_NBFORMAT' | 'TOO_LARGE' | 'CANCELLED';

export class DiffError extends Error {
  code: DiffErrorCode;
  line?: number;
  column?: number;

  constructor(code: DiffErrorCode, message: string, line?: number, column?: number) {
    super(message);
    this.name = 'DiffError';
    this.code = code;
    this.line = line;
    this.column = column;
    Object.setPrototypeOf(this, DiffError.prototype);
  }
}
