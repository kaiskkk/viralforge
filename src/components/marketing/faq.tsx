import { Plus } from "lucide-react";

import { FREE_CREDITS } from "@/lib/plans";

const QUESTIONS = [
  {
    question: "Comment le score viral est-il calculé ?",
    answer:
      "Le simulateur mesure cinq signaux directement dans ton navigateur : la force du hook, le rythme des phrases, la tension entretenue, la clarté du propos et la chute. C'est une estimation instantanée de la forme de ton script, pas une prédiction de vues. Pour une lecture passage par passage, utilise l'outil Anti-Dropoff.",
  },
  {
    question: "Qu'est-ce qu'un crédit ?",
    answer: `Un crédit correspond à une génération : un clonage de structure, une analyse Anti-Dropoff, une série complète de 7 scripts ou dix accroches. Tu reçois ${FREE_CREDITS} crédits à l'inscription. Une génération qui échoue ne coûte rien. Le Studio, lui, est illimité.`,
  },
  {
    question: "Le Studio envoie-t-il mes vidéos quelque part ?",
    answer:
      "Non. Le téléprompteur et l'enregistrement fonctionnent dans ton navigateur : la vidéo reste sur ton appareil jusqu'à ce que tu la télécharges ou la partages. Rien n'est envoyé sur nos serveurs.",
  },
  {
    question: "Le Cloneur copie-t-il le script d'origine ?",
    answer:
      "Non. Il reprend la mécanique — l'ordre et la fonction de chaque passage — et la transpose à ton sujet. Aucune phrase, aucun exemple et aucun chiffre du script source ne sont réutilisés.",
  },
  {
    question: "Quelle IA écrit les scripts ?",
    answer:
      "Un modèle de langage, encadré par des consignes écrites pour la vidéo courte. Elles lui interdisent d'inventer des chiffres : quand une preuve est nécessaire, il laisse un emplacement à compléter avec tes propres données.",
  },
  {
    question: "Puis-je annuler le plan Pro ?",
    answer:
      "Oui, à tout moment. L'abonnement est sans engagement et tu gardes l'accès illimité jusqu'à la fin de la période payée.",
  },
];

export function Faq() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="text-center text-3xl font-semibold tracking-tightest sm:text-[40px]">
          <span className="text-gradient">Questions fréquentes</span>
        </h2>
        <div className="mt-10 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus
                  className="size-4 shrink-0 text-faint transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
