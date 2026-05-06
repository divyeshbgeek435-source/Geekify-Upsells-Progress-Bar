-- This migration directory existed without a SQL file, which blocks Prisma migration execution (P3015).
-- Intentionally left as a no-op to restore migration chain integrity.
SELECT 1;
