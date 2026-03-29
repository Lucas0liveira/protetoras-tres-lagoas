-- Public function to return animal status counts without requiring auth.
-- Uses SECURITY DEFINER to bypass RLS, so unauthenticated visitors on the
-- home page can see accurate counters.

CREATE OR REPLACE FUNCTION public.get_animal_status_counts()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::text, COUNT(*)::bigint
  FROM animals
  WHERE deleted_at IS NULL
    AND status != 'obito'
  GROUP BY status;
$$;

GRANT EXECUTE ON FUNCTION public.get_animal_status_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_animal_status_counts() TO authenticated;
