import { ChartSpline, Clapperboard, MessageSquare, NotebookPen, Ruler } from "lucide-react";

const ROWS = [
  {
    icon: Ruler,
    title: "Juger ton script",
    chatbot: "Un avis, différent à chaque fois que tu redemandes.",
    forge: "Une mesure : score de hook et courbe de rétention, identiques pour un même texte. Tu compares tes versions.",
  },
  {
    icon: ChartSpline,
    title: "Voir où ça décroche",
    chatbot: "Te dit que « l'intro est un peu longue ».",
    forge: "Te montre la seconde où les spectateurs partent, pendant que tu écris, phrase par phrase.",
  },
  {
    icon: NotebookPen,
    title: "Connaître tes résultats",
    chatbot: "Ne sait que ce que tu lui recolles.",
    forge: "Garde le journal de tes vidéos et en tire ta durée, ton style de hook et ton jour qui marchent le mieux.",
  },
  {
    icon: Clapperboard,
    title: "Passer à la vidéo",
    chatbot: "S'arrête au texte.",
    forge: "Téléprompteur sur ta caméra : tu te filmes et tu repars avec la vidéo.",
  },
];

/** « Ce qu'un chatbot ne fait pas » : la différence, ligne par ligne. */
export function BeyondChatbot() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="beyond-title">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-[13px] font-medium text-accent">Pas un chatbot de plus</p>
          <h2 id="beyond-title" className="mt-3 text-3xl font-semibold tracking-tightest sm:text-[40px]">
            <span className="text-gradient">Un chatbot te répond. ViralForge mesure, te filme et apprend de tes chiffres.</span>
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="hidden grid-cols-[1fr_1.2fr_1.6fr] gap-px bg-white/[0.06] text-[11px] uppercase tracking-widest text-faint md:grid">
            <span className="bg-bg px-5 py-3" />
            <span className="flex items-center gap-2 bg-bg px-5 py-3">
              <MessageSquare className="size-3.5" aria-hidden />
              Un chatbot
            </span>
            <span className="bg-bg px-5 py-3 text-accent">ViralForge</span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {ROWS.map((row) => (
              <li key={row.title} className="grid gap-3 bg-surface/60 p-5 md:grid-cols-[1fr_1.2fr_1.6fr] md:gap-6">
                <p className="flex items-center gap-3 text-[15px] font-semibold tracking-tight">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <row.icon className="size-[18px]" aria-hidden />
                  </span>
                  {row.title}
                </p>
                <p className="text-[13px] leading-relaxed text-faint">
                  <span className="mr-1.5 text-[11px] uppercase tracking-widest md:hidden">Chatbot :</span>
                  {row.chatbot}
                </p>
                <p className="text-sm leading-relaxed text-fg">
                  <span className="mr-1.5 text-[11px] uppercase tracking-widest text-accent md:hidden">ViralForge :</span>
                  {row.forge}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
