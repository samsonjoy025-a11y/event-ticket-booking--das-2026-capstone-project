import { ERROR_CODES } from './error-codes.js';

export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = Object.values(ERROR_CODES).includes(code)
      ? code
      : ERROR_CODES.INTERNAL_ERROR;
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export function createError(code, message) {
  return new AppError(code, message);
}