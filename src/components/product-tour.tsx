"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Award, ChevronLeft, ChevronRight, Home, Map, Rocket, Sparkles, Target, TimerReset, Trophy, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { completeProductTour } from "@/app/actions/tour";

const steps = [
  { title: "Bem-vindo à sua jornada!", eyebrow: "LEVELUP 100", description: "Aqui cada sessão vira progresso, XP e uma história de consistência. Em menos de um minuto, você conhece tudo.", icon: Rocket, target: null, accent: "#6c4cff", reward: "+10 XP de boas-vindas" },
  { title: "Seu mapa de comando", eyebrow: "MENU PRINCIPAL", description: "Use o menu para navegar pela jornada. No celular, as mesmas áreas ficam sempre acessíveis na barra inferior.", icon: Map, target: "nav", accent: "#6c4cff", reward: "6 áreas para explorar" },
  { title: "Tudo começa no Início", eyebrow: "PÁGINA INICIAL", description: "Acompanhe sua sequência, tempo, XP, missão diária e faça o check-in antes de ligar o cronômetro.", icon: Home, target: "home", accent: "#27ae76", reward: "Seu painel de evolução" },
  { title: "Registre cada sessão", eyebrow: "SESSÕES", description: "Consulte o histórico, encontre estudos por título ou objetivo e acompanhe quanto tempo investiu em cada tema.", icon: TimerReset, target: "sessions", accent: "#2f87d8", reward: "Seu histórico em um só lugar" },
  { title: "Suba no pódio", eyebrow: "RANKING", description: "Compare XP, tempo e sequência com a comunidade. Você controla no perfil como seu nome, foto e LinkedIn aparecem.", icon: Trophy, target: "ranking", accent: "#d49400", reward: "Ouro, prata e bronze" },
  { title: "Colecione conquistas", eyebrow: "BADGES", description: "Desbloqueie badges por sequências, horas estudadas, posições no ranking e pelos 100 dias concluídos.", icon: Award, target: "achievements", accent: "#d95c8a", reward: "13 marcos especiais" },
  { title: "Uma hora por dia", eyebrow: "META DIÁRIA", description: "Sua meta padrão é completar 60 minutos. A barra de progresso mostra quanto falta para vencer a missão do dia.", icon: Target, target: "daily-mission", accent: "#27ae76", reward: "60 min = missão cumprida" },
] as const;

type Rect = { top: number; left: number; width: number; height: number };

export function ProductTour({ open }: { open: boolean }) {
  const [visible, setVisible] = useState(open);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pending, startTransition] = useTransition();
  const current = steps[step];
  const Icon = current.icon;

  useEffect(() => {
    if (!visible || !current.target) {
      const frame = window.requestAnimationFrame(() => setRect(null));
      return () => window.cancelAnimationFrame(frame);
    }
    const update = () => {
      const candidates = [...document.querySelectorAll<HTMLElement>(`[data-tour="${current.target}"]`)];
      const target = candidates.find((element) => element.offsetParent !== null);
      if (!target) { setRect(null); return; }
      const value = target.getBoundingClientRect();
      setRect({ top: Math.max(8, value.top - 8), left: Math.max(8, value.left - 8), width: Math.min(window.innerWidth - 16, value.width + 16), height: value.height + 16 });
    };
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [current.target, visible]);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
  if (!visible) return null;

  function closeTour() {
    startTransition(async () => {
      const result = await completeProductTour();
      if (!result.ok) { toast.error(result.message); return; }
      setVisible(false);
      if (step === steps.length - 1) toast.success("Tutorial concluído. Sua jornada começou! 🚀");
    });
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Apresentação do aplicativo">
      {rect ? <div className="tour-spotlight fixed rounded-2xl" style={rect} aria-hidden="true" /> : <div className="fixed inset-0 bg-[#11101d]/70 backdrop-blur-[2px]" aria-hidden="true" />}
      <section className="tour-panel fixed bottom-3 left-3 right-3 z-[102] mx-auto max-w-lg overflow-hidden rounded-[24px] border border-white/20 bg-[var(--surface)] text-[var(--ink)] shadow-2xl sm:bottom-8 sm:left-auto sm:right-8">
        <div className="h-1.5 bg-[var(--surface-soft)]"><div className="h-full bg-[#6c4cff] transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-[0_4px_0_rgba(0,0,0,.18)]" style={{ background: current.accent }}><Icon size={28} aria-hidden="true" /></span>
            <button type="button" className="icon-button" onClick={closeTour} disabled={pending} aria-label="Pular apresentação"><X size={18} /></button>
          </div>
          <p className="eyebrow mt-5">{current.eyebrow} · ETAPA {step + 1}/{steps.length}</p>
          <h2 className="font-display mt-2 text-2xl font-black tracking-[-.03em] sm:text-3xl">{current.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{current.description}</p>
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm font-extrabold"><Sparkles size={17} className="text-[#d49400]" />{current.reward}</div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep((value) => value - 1)} disabled={step === 0 || pending}><ChevronLeft size={18} />Voltar</button>
            {step < steps.length - 1 ? <button type="button" className="btn-primary" onClick={() => setStep((value) => value + 1)} disabled={pending}>Próximo<ChevronRight size={18} /></button> : <button type="button" className="btn-primary bg-[#27ae76] shadow-[0_4px_0_#187a51]" onClick={closeTour} disabled={pending}>{pending ? "Salvando..." : "Começar"}<Zap size={18} /></button>}
          </div>
        </div>
      </section>
    </div>
  );
}
