
class AppError extends Error {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode || 500;
        this.details = details;
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request', details) {
        super(message, 400, details);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(message, 404);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict', details) {
        super(message, 409, details);
    }
}

module.exports = {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError
    , ConflictError
};
