"use client";

import { useEffect, useState } from "react";
import { Award, BadgeCheck, CalendarCheck2, Clock3, Crown, Footprints, Gauge, Gem, Hourglass, LockKeyhole, Medal, ShieldCheck, Sparkles, TimerReset, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Achievement } from "@/lib/app-data";

const icons = { footprints: Footprints, "calendar-check": CalendarCheck2, "badge-check": BadgeCheck, "shield-check": ShieldCheck, "clock-3": Clock3, timer: TimerReset, hourglass: Hourglass, gauge: Gauge, gem: Gem, medal: Medal, crown: Crown, trophy: Trophy } as const;
const palettes = [
  { color: "#6c4cff", soft: "#eeeaff" }, { color: "#d49400", soft: "#fff4d3" },
  { color: "#18885a", soft: "#e1f7ed" }, { color: "#d95c8a", soft: "#fde9f1" },
] as const;

function unlockedAt(value: Achievement["user_achievements"]) { return Array.isArray(value) ? value[0]?.unlocked_at : value?.unlocked_at; }

export function AchievementGrid({ achievements, userId }: { achievements: Achievement[]; userId: string }) {
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => {
    const key = `levelup:seen-achievements:${userId}`;
    const unlocked = achievements.filter((item) => unlockedAt(item.user_achievements)).map((item) => item.id);
    let stored: string[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) stored = parsed.filter((value): value is string => typeof value === "string");
    } catch { /* Preferências locais corrompidas não podem quebrar a coleção. */ }
    const seen = new Set(stored);
    const newest = [...achievements].reverse().find((item) => unlocked.includes(item.id) && !seen.has(item.id));
    window.localStorage.setItem(key, JSON.stringify(unlocked));
    if (!newest) return;
    const start = window.setTimeout(() => {
      setCelebrating(newest.id);
      toast.success(`Nova conquista: ${newest.name}!`, { description: "Sua coleção acaba de evoluir." });
    }, 0);
    const finish = window.setTimeout(() => setCelebrating(null), 4200);
    return () => { window.clearTimeout(start); window.clearTimeout(finish); };
  }, [achievements, userId]);

  return <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {achievements.map((item, index) => {
      const date = unlockedAt(item.user_achievements);
      const unlocked = Boolean(date);
      const Icon = icons[item.icon as keyof typeof icons] ?? Award;
      const palette = palettes[index % palettes.length];
      return <article key={item.id} className={`achievement-card card relative overflow-hidden p-6 ${unlocked ? "achievement-unlocked" : "achievement-locked"} ${celebrating === item.id ? "achievement-celebrating" : ""}`} style={{ "--badge-color": palette.color, "--badge-soft": palette.soft } as React.CSSProperties}>
        {celebrating === item.id && <span className="achievement-sparkles" aria-hidden="true"><Sparkles /><Sparkles /><Sparkles /></span>}
        <div className="flex items-start justify-between gap-3">
          <span className="achievement-badge grid h-16 w-16 place-items-center rounded-[20px] border-4 border-white shadow-lg">{unlocked ? <Icon size={31} strokeWidth={2.4} /> : <LockKeyhole size={27} />}</span>
          <span className={`chip ${unlocked ? "bg-[#e1f7ed] text-[#18734f]" : "bg-[var(--surface-soft)] text-[var(--muted)]"}`}>{unlocked ? "Desbloqueada" : "Bloqueada"}</span>
        </div>
        <p className="eyebrow mt-6">BADGE #{String(index + 1).padStart(2, "0")}</p>
        <h2 className="font-display mt-2 text-xl font-black">{item.name}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs font-extrabold">
          <span className="text-[var(--muted)]">{unlocked && date ? new Intl.DateTimeFormat("pt-BR").format(new Date(date)) : conditionLabel(item)}</span>
          <span style={{ color: palette.color }}>{unlocked ? "CONQUISTADA" : "EM PROGRESSO"}</span>
        </div>
      </article>;
    })}
  </section>;
}

function conditionLabel(item: Achievement) {
  if (item.condition_type === "total_seconds") return `${item.condition_value / 3600}h acumuladas`;
  if (item.condition_type === "rank_position") return `Alcançar Top ${item.condition_value}`;
  if (item.condition_type === "streak") return `${item.condition_value} dias seguidos`;
  if (item.condition_type === "completed_days" || item.condition_type === "checkins") return `${item.condition_value} check-ins`;
  return `Meta: ${item.condition_value}`;
}
