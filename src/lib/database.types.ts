export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      images: {
        Row: {
          id: string
          file_path: string
          file_name: string
          created_at: string
          response_count: number
        }
        Insert: {
          id?: string
          file_path: string
          file_name: string
          created_at?: string
          response_count?: number
        }
        Update: {
          id?: string
          file_path?: string
          file_name?: string
          created_at?: string
          response_count?: number
        }
      }
      annotations: {
        Row: {
          id: string
          image_id: string
          annotated_image_url: string
          created_at: string
          session_id: string
        }
        Insert: {
          id?: string
          image_id: string
          annotated_image_url: string
          created_at?: string
          session_id: string
        }
        Update: {
          id?: string
          image_id?: string
          annotated_image_url?: string
          created_at?: string
          session_id?: string
        }
      }
    }
  }
}