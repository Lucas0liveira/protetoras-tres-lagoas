# Requirements — Round 3

Source: written requirements sheet from NGO coordinator, received 2026-04-08.
Nomenclature clarification applied 2026-04-08 (see R3/R4/R5).

---

## Nomenclature — Three Distinct Groups

This distinction is critical and must be reflected consistently across the UI:

| Term | Who they are | Where stored |
|---|---|---|
| **Colaboradoras** | Official NGO volunteers — the "protetoras" themselves. Assigned as *acompanhantes* responsible for animals. Can be multiple per animal. | New `colaboradoras` table |
| **Interessados** | Members of the public who submitted a form (adoption, foster, volunteer interest, donation). Not yet affiliated with the NGO. | `interests` table |
| **Custódios** | People who currently have an animal in their physical care (adopter or temp home). | `custodians` table (existing) |

**Rule:** Never use "Voluntários" to mean NGO members. "Voluntários" in the nav refers to the public interest form submissions (`interests`). NGO members are "Colaboradoras".

---

## Compatibility with Current DB

**Short answer: yes, fully compatible.** Every item below is additive — new columns with defaults, new enum values, or new tables. None of them alter or break existing data.

---

## Requirement Analysis

### R1 — Edit all records
**Request:** Make it clear how to correct a mistaken entry (medication name, visit info, etc.).
**Current state:** Edit modals already exist for animals, rescues, custody, and some sub-records.
**Gap:** Inline edit buttons on medical records, exams, medications, and sanitary procedures in `AnimalDetail.tsx` may not be visible enough. Likely a UX/discoverability issue rather than missing functionality.
**Action:** Audit `AnimalDetail.tsx` — confirm edit buttons exist on every sub-record row. Add where missing. Consider an "Editar" icon button on each card row.

---

### R2 — Archive/soft-delete animal with reason
**Request:** Don't permanently delete animals; offer "Archive" or "Inactivate" with a reason.
**Current state:** `deleted_at` soft delete exists on `animals`. The delete button in the UI triggers it, but there's no reason field or friendly "Archive" UI.
**Gap:** No `archive_reason` field; delete button is abrupt.
**Action:**
- Add `archive_reason TEXT` column to `animals`
- Replace the delete button with an "Arquivar" action that opens a small modal with reason options:
  - Erro de cadastro
  - Óbito (already covered by status — note this)
  - Outro (free text)
- Archived animals stay in DB, just hidden from active listings

**Migration:** `ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_reason TEXT;`

---

### R3 — Colaboradoras management (replaces "Field Volunteers")
**Request:** Create a dedicated register of active NGO volunteers ("colaboradoras" / "acompanhantes"). On the animal form, allow selecting multiple colaboradoras from a dropdown instead of free text. **No cap on the number** — an animal can have as many acompanhantes as needed.
**Current state:** `animals.acompanhante TEXT` free-text field. Works as a stopgap.
**Gap:** No structured table; no multi-assign; no dropdown; no upper limit defined.
**Action:**
1. New table `colaboradoras` (name, phone, email, notes, is_active, created_by FK → profiles, timestamps, deleted_at)
2. New junction table `animal_colaboradoras` (animal_id FK, colaboradora_id FK, assigned_at, assigned_by FK → profiles) — **no row limit enforced**, uniqueness on (animal_id, colaboradora_id)
3. **Revamp the existing Volunteers page** (see R4/R5) — add "Colaboradoras" as a second tab rather than creating a new page
4. On animal edit modal and register dialog: replace `acompanhante` text field with a multi-select (unlimited) from `colaboradoras` where `is_active = true`
5. In Animals.tsx listing: show colaboradora names in the "Acompanhante" column from the junction table
6. Keep `animals.acompanhante TEXT` as deprecated fallback (don't remove — may have legacy free-text data)

**New tables:** `colaboradoras`, `animal_colaboradoras`
**No new page** — handled via tab in the revamped Volunteers/Interests page (R4/R5)

---

### R4/R5 — Revamp "Voluntários" page into a tabbed Interests + Colaboradoras page
**Request (combined):** The "Voluntários" nav item and page cause confusion because they mix NGO internal people with public interest submissions. The page and nav item need renaming, and NGO member management should live here under a clear tab — not on a separate page.
**Current state:** `Volunteers.tsx` shows `interests` rows. Nav label is "Voluntários".
**Desired state:**
- Nav item renamed to **"Formulários & Equipe"** (or similar — open to iteration)
- Page has two tabs:
  - **"Formulários de Interesse"** — the existing interests table (adoption, foster, volunteer interest, contributions from the public)
  - **"Colaboradoras"** — CRUD for the new `colaboradoras` table (NGO internal members)
**Action:**
- Rename nav label in `Layout.tsx`
- Rename page heading in `Volunteers.tsx`
- Add tab switcher at top of page
- Implement Colaboradoras tab with add/edit/deactivate UI (inline or modal)
- Optionally rename file to `InterestsAndTeam.tsx` during this refactor

**Zero extra DB changes beyond R3.**

---

### R6 — Microchip procedure + number
**Request:** Add microchip as a sanitary procedure with a field for the chip registration number.
**Current state:** `sanitary_procedure_enum` has: castracao, vacina_v8, vacina_v10, vacina_antirabica, vermifugacao, bravecto, coleira_leishmaniose, transfusao_sanguinea, outro.
**Action:**
1. `ALTER TYPE sanitary_procedure_enum ADD VALUE IF NOT EXISTS 'microchipagem';`
2. `ALTER TABLE sanitary_procedures ADD COLUMN IF NOT EXISTS microchip_number TEXT;` — nullable, only relevant for this procedure type
3. In the procedure modal: when type = `microchipagem`, show the chip number field
4. On `AnimalDetail.tsx` Identificação section: show "Microchipado: Sim — Nº XXXXX" when a microchip procedure exists
5. Add `microchipagem` badge to the health badges system (both dashboard and public cards)

**Migration:** One migration with both changes.

---

### R7 — Multiple phone numbers for clinics
**Request:** Most clinics have WhatsApp + landline + emergency numbers.
**Current state:** `clinics.phone TEXT` — single field.
**Action:**
1. Add `clinics.phones JSONB DEFAULT '[]'` — array of `{ type: 'whatsapp' | 'fixo' | 'emergencia', number: string }`
2. Keep `clinics.phone` column for now (don't drop it — could have legacy data); migrate its value into the `phones` array in the same migration
3. In the clinic add/edit modal: replace the single phone input with a dynamic list — "Adicionar telefone" button, each entry has a type selector + number input
4. In clinic cards/detail: render all phones with type icons

**Migration:** `ALTER TABLE clinics ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]';`

---

### R8 — Exam file attachments (PDF / images)
**Request:** Ability to attach PDF or image files to exam records and view them in-system.
**Current state:** `exams` table has no attachment column.
**Action:**
1. New table `exam_attachments` (id, exam_id FK → exams, file_url TEXT, file_name TEXT, file_type TEXT, uploaded_by FK → profiles, created_at)
2. Use Cloudinary for storage (same as animal photos) — the `upload` API accepts PDFs
3. In the exam form modal: "Anexar arquivo" button → opens file picker → uploads to Cloudinary → saves record
4. In `AnimalDetail.tsx` exam rows: show a paperclip icon if attachments exist; clicking opens a preview modal
5. For PDFs: render an `<iframe>` or link to open in browser tab

**New table:** `exam_attachments`
**New migration + TypeScript type**

---

### R9 — Adoption form improvements + interest labels
**Request:**
a) Make email and WhatsApp phone required in the adoption form
b) Allow attaching photos of the adoption candidate's home environment
c) Add labels/tags to interest records: "Reprovado", "Rota de fuga", "Menor de idade", custom
**Current state:**
- `AdocaoForm.tsx` uses `form_data JSONB` — phone is required, email is not
- `interests` table has no labels field
**Action:**
a) In `AdocaoForm.tsx` Zod schema: change email to required
b) Add a "Fotos do ambiente" upload step in `AdocaoForm.tsx` — upload to Cloudinary, store URLs in `form_data.home_photos[]`
c) Add `labels TEXT[] DEFAULT '{}'` to `interests` table. In Interests tab: show colored label chips on each row, allow adding/removing labels via a popover. Predefined labels:
   - `Reprovado` (red)
   - `Rota de fuga` (orange)
   - `Menor de idade` (yellow)
   - `Aprovado` (green)
   - `Em análise` (blue)
   - Custom (free text)

**Migration:** `ALTER TABLE interests ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';`

---

## Summary Table

| # | Feature | DB Change | App Change | Effort |
|---|---|---|---|---|
| R1 | Edit all records | None | Audit/add edit buttons in AnimalDetail | Small |
| R2 | Archive with reason | Add `archive_reason TEXT` | Replace delete → archive modal | Small |
| R3 | Colaboradoras table (no cap) | New `colaboradoras` + `animal_colaboradoras` | Tab in Volunteers page + animal form multi-select | Large |
| R4/R5 | Revamp Volunteers page — tabs for Interests + Colaboradoras | None extra | Tab UI, nav rename | Medium |
| R6 | Microchip | Add enum value + column | Procedure modal + detail display | Small |
| R7 | Multiple clinic phones | Add `phones JSONB` | Clinic modal dynamic list | Medium |
| R8 | Exam file attachments | New `exam_attachments` table | Upload + preview in AnimalDetail | Large |
| R9a | Required email in adoption | None | Zod schema change | Trivial |
| R9b | Home photos in adoption | None (uses form_data JSONB) | Upload step in AdocaoForm | Medium |
| R9c | Interest labels | Add `labels TEXT[]` | Label chips + editor in Interests tab | Medium |

---

## Suggested Implementation Order

1. **R4/R5** — Rename nav + page heading (trivial, zero risk, immediate clarity)
2. **R9a** — Required email in adoption form (trivial)
3. **R1** — Audit edit buttons (small, high value for current users)
4. **R2** — Archive with reason (small, already requested)
5. **R6** — Microchip (small migration, standalone)
6. **R9c** — Interest labels (medium, high value for managing adoption candidates)
7. **R7** — Multiple clinic phones (medium)
8. **R3/R4** — Colaboradoras table + revamp Volunteers page with tabs (large, builds on R4/R5 rename already done)
9. **R8** — Exam file attachments (large, needs Cloudinary integration)
10. **R9b** — Home photos in adoption form (medium, depends on R8 pattern)

---

## Notes on Compatibility

- All migrations are `ADD COLUMN IF NOT EXISTS` or `ADD VALUE IF NOT EXISTS` — zero risk to existing data
- `colaboradoras` and `animal_colaboradoras` are new tables — no interference
- `exam_attachments` is a new table — no interference
- The `interests.labels` column defaults to `'{}'` so existing rows are unaffected
- `animals.archive_reason` defaults to NULL so existing rows are unaffected
