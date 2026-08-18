import { Medal, Sparkles } from "lucide-react";
import { AchievementGrid } from "@/components/achievement-grid";
import { getAchievementsData, type Achievement } from "@/lib/app-data";

function unlock(value: Achievement["user_achievements"]) { return Array.isArray(value) ? value[0]?.unlocked_at : value?.unlocked_at; }

export default async function AchievementsPage() {
  const data = await getAchievementsData();
  const unlocked = data.achievements.filter((item) => unlock(item.user_achievements)).length;
  const progress = data.achievements.length ? Math.round(unlocked / data.achievements.length * 100) : 0;
  return <>
    <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><p className="eyebrow">SALA DE TROFÉUS</p><h1 className="font-display mt-2 text-3xl font-black tracking-[-.04em] md:text-4xl">Sua coleção de conquistas</h1><p className="mt-2 max-w-2xl text-[var(--muted)]">Cada badge conta um capítulo da sua evolução. Continue a sequência, acumule horas e conquiste seu lugar no pódio.</p></div>
      <div className="card min-w-64 p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4d3] text-[#d49400]"><Medal /></span><div><span className="text-xs font-bold text-[var(--muted)]">Coleção desbloqueada</span><strong className="font-display block text-xl">{unlocked} de {data.achievements.length}</strong></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[#6c4cff]" style={{ width: `${progress}%` }} /></div><span className="mt-2 flex items-center gap-1 text-xs font-extrabold text-[#6c4cff]"><Sparkles size={13} />{progress}% da coleção</span></div>
    </section>
    <AchievementGrid achievements={data.achievements} userId={data.user.id} />
  </>;
}
