"use client";

import { useMemo, useState } from "react";
import { Clock3, Flame, Medal, Trophy, Zap } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import type { RankingEntry } from "@/lib/app-data";
import { formatDuration, initials } from "@/lib/utils";

const filters = ["XP", "Tempo total", "Maior sequência", "Mais check-ins"] as const;
type Filter = (typeof filters)[number];

const podiumStyle = {
  1: { label: "OURO", ring: "#f0b90b", soft: "#fff4c2", height: "sm:min-h-72", icon: Trophy },
  2: { label: "PRATA", ring: "#98a2b3", soft: "#eef1f5", height: "sm:min-h-60", icon: Medal },
  3: { label: "BRONZE", ring: "#b86d3a", soft: "#f8e4d5", height: "sm:min-h-52", icon: Medal },
} as const;

export function RankingBoard({ entries, currentUserId }: { entries: RankingEntry[]; currentUserId: string }) {
  const [filter, setFilter] = useState<Filter>("XP");
  const rows = useMemo(() => [...entries].sort((a, b) => {
    if (filter === "Tempo total") return b.total_seconds - a.total_seconds;
    if (filter === "Maior sequência") return b.current_streak - a.current_streak;
    if (filter === "Mais check-ins") return b.completed_days - a.completed_days;
    return b.total_xp - a.total_xp;
  }), [entries, filter]);
  const ranked = rows.slice(0, 3).map((entry, index) => ({ entry, position: index + 1 as 1 | 2 | 3 }));
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean) as typeof ranked;

  return <>
    <div className="scrollbar-none mt-7 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Ordenar ranking">
      {filters.map((value) => <button key={value} onClick={() => setFilter(value)} className={filter === value ? "btn-primary whitespace-nowrap" : "btn-secondary whitespace-nowrap"} aria-pressed={filter === value}>{value}</button>)}
    </div>

    {rows.length ? <>
      <section className="mt-6 grid items-end gap-3 sm:grid-cols-3" aria-label="Pódio do ranking">
        {podium.map(({ entry, position }) => {
          const style = podiumStyle[position];
          const PositionIcon = style.icon;
          return <article key={entry.user_id} className={`podium-card card relative flex flex-col items-center justify-end overflow-hidden px-4 pb-0 pt-6 text-center ${style.height} ${position === 1 ? "sm:col-start-2 sm:row-start-1" : position === 2 ? "sm:col-start-1 sm:row-start-1" : "sm:col-start-3 sm:row-start-1"}`} style={{ "--podium-color": style.ring, "--podium-soft": style.soft } as React.CSSProperties}>
            <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ color: style.ring, background: style.soft }}><PositionIcon size={14} fill="currentColor" />{style.label}</span>
            <Avatar entry={entry} large={position === 1} />
            <strong className="font-display mt-3 max-w-full truncate text-lg">{entry.display_name}</strong>
            <span className="ranking-metric mt-1 text-sm font-black">{metric(entry, filter)}</span>
            <div className={`podium-step mt-5 flex w-full flex-col items-center justify-center rounded-t-2xl text-white ${position === 1 ? "h-24" : position === 2 ? "h-20" : "h-16"}`} style={{ background: style.ring }}><span className="font-display text-3xl font-black">{position}º</span><span className="text-[10px] font-black tracking-[.16em]">LUGAR</span></div>
          </article>;
        })}
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-black uppercase text-[var(--muted)] md:grid-cols-[60px_1fr_110px_120px_90px_52px] md:px-5"><span>#</span><span>Participante</span><span className="hidden md:block">Sequência</span><span className="hidden md:block">Tempo</span><span>XP</span><span className="hidden text-center md:block">Contato</span></div>
        {rows.map((entry, index) => <div key={entry.user_id} className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-4 last:border-0 md:grid-cols-[60px_1fr_110px_120px_90px_52px] md:px-5 ${entry.user_id === currentUserId ? "ranking-current-row" : ""}`}>
          <span className="font-display text-lg font-black text-[var(--muted)]">{index + 1}</span>
          <div className="flex min-w-0 items-center gap-3"><Avatar entry={entry} /><div className="min-w-0"><strong className="block truncate">{entry.display_name}{entry.user_id === currentUserId && <span className="ml-2 rounded bg-[#6c4cff] px-1.5 py-0.5 text-[9px] text-white">VOCÊ</span>}</strong><span className="text-xs text-[var(--muted)]">Nível {entry.level} · {entry.completed_days} check-ins</span>{entry.linkedin_handle && <a className="mt-1 flex w-fit items-center gap-1 text-xs font-extrabold text-[#0a66c2] md:hidden" href={linkedinUrl(entry.linkedin_handle)} target="_blank" rel="noopener noreferrer"><FaLinkedinIn size={13} />LinkedIn</a>}</div></div>
          <span className="ranking-streak hidden items-center gap-1 font-bold md:flex"><Flame size={16} />{entry.current_streak} dias</span>
          <span className="ranking-time hidden items-center gap-1 font-bold md:flex"><Clock3 size={16} />{formatDuration(entry.total_seconds)}</span>
          <span className="ranking-metric flex items-center gap-1 font-black"><Zap size={15} fill="currentColor" />{entry.total_xp.toLocaleString("pt-BR")}</span>
          <span className="hidden justify-center md:flex">{entry.linkedin_handle && <a className="linkedin-button" href={linkedinUrl(entry.linkedin_handle)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir LinkedIn de ${entry.display_name}`} title={`LinkedIn de ${entry.display_name}`}><FaLinkedinIn size={18} /></a>}</span>
        </div>)}
      </section>
    </> : <section className="card mt-6 p-10 text-center"><Trophy className="mx-auto text-[var(--muted)]" /><h2 className="font-display mt-3 text-xl font-black">Ranking ainda vazio</h2><p className="mt-2 text-sm text-[var(--muted)]">Os participantes visíveis aparecerão aqui.</p></section>}
  </>;
}

function Avatar({ entry, large = false }: { entry: RankingEntry; large?: boolean }) {
  return <span className={`avatar shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg ${large ? "text-xl" : "text-sm"} ${entry.avatar_url ? "avatar-photo" : ""}`} style={{ width: large ? 96 : 48, height: large ? 96 : 48, ...(entry.avatar_url ? { backgroundImage: `url(${entry.avatar_url})` } : {}) }}>{entry.avatar_url ? <span className="sr-only">Foto de {entry.display_name}</span> : initials(entry.display_name)}</span>;
}

function linkedinUrl(handle: string) { return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`; }
function metric(entry: RankingEntry, filter: Filter) { if (filter === "Tempo total") return formatDuration(entry.total_seconds); if (filter === "Maior sequência") return `${entry.current_streak} dias`; if (filter === "Mais check-ins") return `${entry.completed_days} check-ins`; return `${entry.total_xp.toLocaleString("pt-BR")} XP`; }
