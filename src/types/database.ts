// ─── Enums ────────────────────────────────────────────────────────────────────

export type SpeciesEnum            = 'canino' | 'felino' | 'outro'
export type SexEnum                = 'macho' | 'femea' | 'indefinido'
export type AnimalStatusEnum       = 'pendente_resgate' | 'resgatado' | 'lar_temporario' | 'disponivel' | 'adotado' | 'obito' | 'dono_identificado'
export type PorteEnum              = 'mini' | 'pequeno' | 'medio' | 'grande' | 'gigante'
export type VisitTypeEnum          = 'emergencia' | 'rotina' | 'retorno' | 'cirurgia' | 'outro'
export type ExamResultEnum         = 'reagente' | 'nao_reagente' | 'aguardando' | 'inconclusivo' | 'outro'
export type CustodyTypeEnum        = 'lar_temporario' | 'adocao'
export type CustodyEndReasonEnum   = 'devolucao_incompatibilidade' | 'devolucao_mudanca' | 'devolucao_alergia' | 'falecimento_responsavel' | 'transferencia' | 'obito_animal' | 'outro'
export type SanitaryProcedureEnum  = 'castracao' | 'vacina_v8' | 'vacina_v10' | 'vacina_antirabica' | 'vermifugacao' | 'bravecto' | 'coleira_leishmaniose' | 'transfusao_sanguinea' | 'outro'
export type UserRoleEnum           = 'admin' | 'volunteer'
export type InterestTypeEnum       = 'adocao' | 'lar_temporario' | 'contribuicao' | 'voluntario'
export type InterestStatusEnum     = 'pendente' | 'contactado' | 'aprovado' | 'recusado'

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string; display_name: string; role: UserRoleEnum; phone: string | null; active: boolean; created_at: string
}

export interface Animal {
  id: string; name: string; species: SpeciesEnum; sex: SexEnum; breed: string | null
  coat_description: string | null; birth_estimate: string | null; notes: string | null
  status: AnimalStatusEnum
  is_special_needs: boolean
  special_needs_description: string | null
  porte: PorteEnum | null
  color: string | null
  google_drive_url: string | null
  palavra_chave: string | null
  acompanhante: string | null
  created_by: string | null; updated_by: string | null
  created_at: string; updated_at: string; deleted_at: string | null
}

export interface AnimalRescue {
  id: string; animal_id: string; rescue_date: string | null; rescue_location: string | null
  rescue_notes: string | null; rescued_by: string | null; created_by: string | null
  rescue_lat: number | null; rescue_lng: number | null
  created_at: string; updated_at: string
}

export interface Clinic {
  id: string; name: string; phone: string | null; address: string | null
  contact_vet: string | null; notes: string | null; created_by: string | null
  created_at: string; updated_at: string; deleted_at: string | null
}

export interface ClinicProcedureCost {
  id: string; clinic_id: string; procedure_name: string; cost: number | null
  notes: string | null; created_by: string | null; created_at: string; updated_at: string
}

export interface Custodian {
  id: string; full_name: string; cpf: string | null; rg: string | null; phone: string
  email: string | null; address_street: string | null; address_number: string | null
  address_neighborhood: string | null; address_city: string | null; notes: string | null
  created_by: string | null; created_at: string; updated_at: string; deleted_at: string | null
}

export interface AnimalCustody {
  id: string; animal_id: string; custodian_id: string; custody_type: CustodyTypeEnum
  started_at: string; termo_date: string | null; is_active: boolean; ended_at: string | null
  end_reason: CustodyEndReasonEnum | null; end_notes: string | null; created_by: string | null
  created_at: string; updated_at: string
  custodian?: Pick<Custodian, 'id' | 'full_name' | 'phone'>
}

export interface MedicalRecord {
  id: string; animal_id: string; clinic_id: string | null; visit_date: string
  vet_name: string | null; visit_type: VisitTypeEnum; description: string
  follow_up_notes: string | null; follow_up_date: string | null
  created_by: string | null; updated_by: string | null; created_at: string; updated_at: string
  clinic?: Pick<Clinic, 'id' | 'name'>; exams?: Exam[]; medications?: Medication[]
}

export interface Exam {
  id: string; animal_id: string; medical_record_id: string | null; exam_name: string
  result: ExamResultEnum; result_detail: string | null; exam_date: string | null
  result_date: string | null; created_by: string | null; created_at: string; updated_at: string
}

export interface Medication {
  id: string; animal_id: string; medical_record_id: string | null; name: string
  dosage: string | null; frequency: string | null; duration_days: number | null
  start_date: string | null; notes: string | null; created_by: string | null
  created_at: string; updated_at: string
}

export interface SanitaryProcedure {
  id: string; animal_id: string; procedure_type: SanitaryProcedureEnum
  performed_date: string; next_due_date: string | null; description: string | null
  created_by: string | null; created_at: string; updated_at: string
}

export interface Interest {
  id: string; animal_id: string | null; full_name: string; phone: string
  email: string | null; message: string | null; interest_type: InterestTypeEnum
  status: InterestStatusEnum; admin_notes: string | null
  form_data: Record<string, unknown> | null
  created_at: string; updated_at: string
  animal?: Pick<Animal, 'id' | 'name' | 'species'>
}

export interface AnimalPhoto {
  id: string; animal_id: string; storage_path: string; is_cover: boolean
  caption: string | null; taken_at: string | null; uploaded_by: string | null; created_at: string
}

export interface PharmacyItem {
  id: string; name: string; description: string | null
  quantity: number; unit: string | null; expiration_date: string | null
  batch_number: string | null; created_by: string | null
  created_at: string; updated_at: string; deleted_at: string | null
}

export interface Alert {
  id: string; title: string; body: string
  link_url: string | null; link_label: string | null; image_url: string | null
  is_active: boolean; created_by: string | null; created_at: string; updated_at: string
}

export interface SiteConfig {
  key: string; value: unknown; updated_by: string | null; updated_at: string
}

export interface FinancialRecord {
  id: string; period: string; type: 'receita' | 'despesa'
  category: string | null; description: string; amount: number
  reference_date: string | null; source: string | null
  created_by: string | null; created_at: string
}

export interface CollectionPoint {
  id: string; name: string; address: string; neighborhood: string | null
  notes: string | null; is_active: boolean; created_by: string | null
  created_at: string; updated_at: string; deleted_at: string | null
}

// ─── Status sort order ────────────────────────────────────────────────────────

export const STATUS_ORDER: Record<AnimalStatusEnum, number> = {
  pendente_resgate: 0, resgatado: 1, lar_temporario: 2, disponivel: 3,
  adotado: 4, obito: 5, dono_identificado: 6,
}
