// lib/database.types.ts
// Placeholder Database type for Phase 1. Regenerate after each migration:
//   pnpm supabase gen types typescript --local > lib/database.types.ts
// See .planning/research/PITFALLS.md Pitfall 5-7 for the RLS + FK conventions
// this type will eventually express.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
