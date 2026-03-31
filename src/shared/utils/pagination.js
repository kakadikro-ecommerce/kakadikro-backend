const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export const normalizePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.max(Number(query.limit) || DEFAULT_LIMIT, 1);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPaginationMeta = ({ total, page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
