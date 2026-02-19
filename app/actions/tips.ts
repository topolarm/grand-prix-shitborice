"use server";

import { getSupabase } from "@/lib/supabase";

export interface Tip {
  id: string;
  viewer_name: string;
  player_name: string;
  player_club: string;
  guessed_speed: number;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
}

// ── Public actions (no password) ──

export async function checkTipsOpen(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("session")
      .select("tips_open")
      .eq("id", 1)
      .single();
    // If we got a valid row, use its value; otherwise default to open (show form)
    if (data) return data.tips_open === true;
    return true;
  } catch {
    return true;
  }
}

export async function submitTip(data: {
  viewerName: string;
  playerName: string;
  playerClub: string;
  guessedSpeed: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabase();

    // Check if tips are open - block unless explicitly open
    const { data: session } = await supabase
      .from("session")
      .select("tips_open")
      .eq("id", 1)
      .single();

    if (session?.tips_open !== true) {
      return { success: false, error: "Tipování je momentálně uzavřeno" };
    }

    const { error } = await supabase.from("tips").insert({
      viewer_name: data.viewerName,
      player_name: data.playerName,
      player_club: data.playerClub,
      guessed_speed: data.guessedSpeed,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chyba připojení k databázi";
    return { success: false, error: msg };
  }
}

// ── Admin actions (password required) ──

export async function getTips(
  password: string
): Promise<{ data?: Tip[]; tipsOpen?: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "Nesprávné heslo" };
  }

  const supabase = getSupabase();

  const [tipsResult, sessionResult] = await Promise.all([
    supabase
      .from("tips")
      .select("*")
      .eq("archived", false)
      .order("player_name", { ascending: true })
      .order("guessed_speed", { ascending: false }),
    supabase.from("session").select("tips_open").eq("id", 1).single(),
  ]);

  if (tipsResult.error) return { error: tipsResult.error.message };

  return {
    data: tipsResult.data as Tip[],
    tipsOpen: sessionResult.data?.tips_open ?? true,
  };
}

export async function setTipsOpen(
  password: string,
  open: boolean
): Promise<{ success: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Nesprávné heslo" };
  }

  const supabase = getSupabase();

  // Upsert ensures the row exists (creates if missing, updates if present)
  const { error } = await supabase
    .from("session")
    .upsert({ id: 1, tips_open: open });

  if (error) return { success: false, error: error.message };

  // Verify the change was applied
  const { data: check } = await supabase
    .from("session")
    .select("tips_open")
    .eq("id", 1)
    .single();

  if (check?.tips_open !== open) {
    return { success: false, error: "Změna se neuložila do databáze" };
  }

  return { success: true };
}

export async function archiveTips(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Nesprávné heslo" };
  }

  const supabase = getSupabase();

  // Archive tips
  const { error } = await supabase
    .from("tips")
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq("archived", false);

  if (error) return { success: false, error: error.message };

  // Reopen tips for next round
  await supabase.from("session").upsert({ id: 1, tips_open: true });

  return { success: true };
}

export async function getArchivedTips(
  password: string
): Promise<{ data?: Tip[]; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "Nesprávné heslo" };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tips")
    .select("*")
    .eq("archived", true)
    .order("archived_at", { ascending: false })
    .order("player_name", { ascending: true })
    .order("guessed_speed", { ascending: false });

  if (error) return { error: error.message };
  return { data: data as Tip[] };
}
