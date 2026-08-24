export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export class InsufficientFundsError extends AppError {
  constructor() {
    super("INSUFFICIENT_FUNDS", "Insufficient balance", 409);
  }
}

export class PlayerBlockedError extends AppError {
  constructor(status: string) {
    super("PLAYER_BLOCKED", `Player is ${status}`, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super("NOT_FOUND", `${what} not found`, 404);
  }
}

export class LimitExceededError extends AppError {
  constructor(scope: string) {
    super("LIMIT_EXCEEDED", `${scope} deposit limit exceeded`, 403);
  }
}
