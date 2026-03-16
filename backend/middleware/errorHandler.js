class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  const body = {
    message: err.message || "Internal server error",
  };

  if (err.details) {
    body.details = err.details;
  }

  res.status(statusCode).json(body);
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
};
