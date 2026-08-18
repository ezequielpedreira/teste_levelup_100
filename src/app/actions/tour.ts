"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeProductTour() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({ product_tour_completed: true })
    .eq("id", auth.user.id);

  if (error) return { ok: false, message: "Não foi possível salvar o tutorial. Tente novamente." };
  revalidatePath("/app", "layout");
  return { ok: true };
}
