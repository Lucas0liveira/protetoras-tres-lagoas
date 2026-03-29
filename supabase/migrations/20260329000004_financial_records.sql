-- Financial records for public transparency reporting

CREATE TABLE financial_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period         TEXT NOT NULL,    -- e.g. "Janeiro 2026"
  type           TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  category       TEXT,             -- e.g. "Medicamentos", "Cirurgias", "Doação"
  description    TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  reference_date DATE,
  source         TEXT,             -- e.g. "Doação PIX", "Evento", "Patrocinador"
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON financial_records(period);
CREATE INDEX ON financial_records(type);
CREATE INDEX ON financial_records(reference_date);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Public can read all financial records (transparency)
CREATE POLICY "public can read financial_records"
  ON financial_records FOR SELECT
  USING (true);

-- Admins can manage financial records
CREATE POLICY "admins can insert financial_records"
  ON financial_records FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "admins can update financial_records"
  ON financial_records FOR UPDATE
  USING (is_admin());

CREATE POLICY "admins can delete financial_records"
  ON financial_records FOR DELETE
  USING (is_admin());
