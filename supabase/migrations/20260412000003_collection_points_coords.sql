-- Add optional geographic coordinates to collection_points.
-- Filled via Nominatim geocoding in the dashboard when a point is created/edited.
-- Only points with lat/lng will appear as map markers.

ALTER TABLE collection_points
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
