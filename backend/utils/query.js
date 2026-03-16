const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parsePagination = (query = {}, options = {}) => {
  const defaultLimit = options.defaultLimit || 20;
  const maxLimit = options.maxLimit || 100;

  const page = parsePositiveInt(query.page, 1);
  const requestedLimit = parsePositiveInt(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const parseSort = (query = {}, fallback = "-createdAt") => {
  if (!query.sort || typeof query.sort !== "string") {
    return fallback;
  }

  return query.sort;
};

module.exports = {
  parsePagination,
  parseSort,
};
