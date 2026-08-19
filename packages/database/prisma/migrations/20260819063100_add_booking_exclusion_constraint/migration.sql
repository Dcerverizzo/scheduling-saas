-- Proteção definitiva contra double-booking (última linha de defesa, além da
-- checagem feita na aplicação): nenhum staff pode ter dois bookings PENDING/CONFIRMED
-- com intervalos [startsAt, endsAt) sobrepostos.
--
-- btree_gist é necessário pra usar operador de igualdade (=) sobre "staffId" (uuid)
-- dentro de uma EXCLUDE constraint baseada em GiST, que originalmente só suporta
-- operadores de range/geometria.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_per_staff"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));
