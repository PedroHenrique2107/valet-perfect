import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/types/valet";
import { isSupabaseConfigured, toTransaction } from "@/services/service-utils";

export async function listTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    if (error) {
      return [];
    }

    return (data ?? []).map(toTransaction);
  } catch {
    return [];
  }
}
