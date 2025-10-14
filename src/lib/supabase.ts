import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      boletos: {
        Row: {
          id: string
          nome: string
          valor: number
          data_vencimento: string
          pago: boolean
          arquivo?: string
          codigo_barras?: string
          data_criacao: string
          usuario_id: string
        }
        Insert: {
          id?: string
          nome: string
          valor: number
          data_vencimento: string
          pago?: boolean
          arquivo?: string
          codigo_barras?: string
          data_criacao?: string
          usuario_id: string
        }
        Update: {
          id?: string
          nome?: string
          valor?: number
          data_vencimento?: string
          pago?: boolean
          arquivo?: string
          codigo_barras?: string
          data_criacao?: string
          usuario_id?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          username: string
          password: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          created_at?: string
        }
      }
    }
  }
}