/**
 * Cỡ một trang của mọi danh sách khoản. Nằm riêng ở đây (không ở `queries.ts`)
 * để component phía client đọc được mà không kéo Prisma theo vào bundle.
 */
export const TRANSACTIONS_PAGE_SIZE = 30;

/** Cỡ một trang của lịch sử "Những lần đã đưa tiền". */
export const SETTLEMENTS_PAGE_SIZE = 20;
