export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    __InternalSupabase: {
        PostgrestVersion: "12"
    }
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string
                    role: string
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string
                    role?: string
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string
                    role?: string
                    avatar_url?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            students: {
                Row: {
                    id: string
                    full_name: string
                    license_type: string
                    klaxo_id: string | null
                    agency: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    full_name: string
                    license_type?: string
                    klaxo_id?: string | null
                    agency?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string
                    license_type?: string
                    klaxo_id?: string | null
                    agency?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            catalog_prices: {
                Row: {
                    id: string
                    service_name: string
                    price_ht: number
                    valid_from: string
                    valid_to: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    service_name: string
                    price_ht: number
                    valid_from?: string
                    valid_to?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    service_name?: string
                    price_ht?: number
                    valid_from?: string
                    valid_to?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            ai_analyses: {
                Row: {
                    id: string
                    student_id: string | null
                    created_by: string | null
                    file_name: string
                    file_type: string
                    student_name_input: string | null
                    agency: string | null
                    instructor_type: string
                    user_comments: string | null
                    ai_extracted_name: string | null
                    total_hours_recorded: number | null
                    driven_hours: number | null
                    planned_hours: number | null
                    total_expected_amount: number | null
                    total_amount_paid: number | null
                    remaining_due: number | null
                    calculated_unit_price: number | null
                    theoretical_catalog_total: number | null
                    revenue_gap: number | null
                    report_status: string
                    summary: string | null
                    discrepancies: Json
                    recommendations: Json
                    catalog_snapshot: Json | null
                    status: string
                    is_validated: boolean
                    validated_at: string | null
                    validated_by: string | null
                    exams_passed: number | null
                    hours_breakdown: Json | null
                    error_message: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    student_id?: string | null
                    created_by?: string | null
                    file_name: string
                    file_type?: string
                    student_name_input?: string | null
                    agency?: string | null
                    instructor_type?: string
                    user_comments?: string | null
                    ai_extracted_name?: string | null
                    total_hours_recorded?: number | null
                    driven_hours?: number | null
                    planned_hours?: number | null
                    total_expected_amount?: number | null
                    total_amount_paid?: number | null
                    remaining_due?: number | null
                    calculated_unit_price?: number | null
                    theoretical_catalog_total?: number | null
                    revenue_gap?: number | null
                    report_status?: string
                    summary?: string | null
                    discrepancies?: Json
                    recommendations?: Json
                    catalog_snapshot?: Json | null
                    status?: string
                    is_validated?: boolean
                    validated_at?: string | null
                    validated_by?: string | null
                    exams_passed?: number | null
                    hours_breakdown?: Json | null
                    error_message?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string | null
                    created_by?: string | null
                    file_name?: string
                    file_type?: string
                    student_name_input?: string | null
                    agency?: string | null
                    instructor_type?: string
                    user_comments?: string | null
                    ai_extracted_name?: string | null
                    total_hours_recorded?: number | null
                    driven_hours?: number | null
                    planned_hours?: number | null
                    total_expected_amount?: number | null
                    total_amount_paid?: number | null
                    remaining_due?: number | null
                    calculated_unit_price?: number | null
                    theoretical_catalog_total?: number | null
                    revenue_gap?: number | null
                    report_status?: string
                    summary?: string | null
                    discrepancies?: Json
                    recommendations?: Json
                    catalog_snapshot?: Json | null
                    status?: string
                    is_validated?: boolean
                    validated_at?: string | null
                    validated_by?: string | null
                    exams_passed?: number | null
                    hours_breakdown?: Json | null
                    error_message?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "ai_analyses_student_id_fkey"
                        columns: ["student_id"]
                        isOneToOne: false
                        referencedRelation: "students"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ai_analyses_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            school_settings: {
                Row: {
                    id: string
                    school_name: string
                    logo_url: string | null
                    tva_rate: number
                    address: string | null
                    phone: string | null
                    email: string | null
                    siret: string | null
                    taux_horaire_salarie: number | null
                    taux_horaire_independant: number | null
                    cout_carburant_heure: number | null
                    assurance_vehicule_heure: number | null
                    cout_secretariat_heure: number | null
                    loyer_charges_heure: number | null
                    frais_divers_ajustement: number | null
                    ai_software_name: string | null
                    ai_custom_instructions: string | null
                    ai_system_prompt: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    school_name?: string
                    logo_url?: string | null
                    tva_rate?: number
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    siret?: string | null
                    taux_horaire_salarie?: number | null
                    taux_horaire_independant?: number | null
                    cout_carburant_heure?: number | null
                    assurance_vehicule_heure?: number | null
                    cout_secretariat_heure?: number | null
                    loyer_charges_heure?: number | null
                    frais_divers_ajustement?: number | null
                    ai_software_name?: string | null
                    ai_custom_instructions?: string | null
                    ai_system_prompt?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    school_name?: string
                    logo_url?: string | null
                    tva_rate?: number
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    siret?: string | null
                    taux_horaire_salarie?: number | null
                    taux_horaire_independant?: number | null
                    cout_carburant_heure?: number | null
                    assurance_vehicule_heure?: number | null
                    cout_secretariat_heure?: number | null
                    loyer_charges_heure?: number | null
                    frais_divers_ajustement?: number | null
                    ai_software_name?: string | null
                    ai_custom_instructions?: string | null
                    ai_system_prompt?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}
