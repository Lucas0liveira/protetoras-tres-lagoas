-- aceita_lar_temporario: controls whether the "Oferecer lar temporário" CTA is shown on the public page.
--   Default true to preserve current behaviour for existing animals.
-- condicoes_lar: free-text conditions for the foster/temporary home
--   (e.g., "sem outros animais", "sem crianças"). Shown below the CTA on the public page.

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS aceita_lar_temporario BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS condicoes_lar TEXT;
