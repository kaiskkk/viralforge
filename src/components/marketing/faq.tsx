import { Plus } from "lucide-react";

import { FREE_CREDITS } from "@/lib/plans";

const QUESTIONS = [
  {
    question: "Pourquoi pas simplement un chatbot ?",
    answer:
      "Un chatbot te donne un avis sur ton script, différent à chaque fois. ViralForge le mesure : courbe de rétention seconde par seconde, score de hook, identiques pour un même texte, donc comparables d'une version à l'autre. Il te filme avec un téléprompteur, et il apprend de tes vrais chiffres dans le Journal de performance.",
  },
  {
    question: "La courbe de rétention est-elle exacte ?",
    answer:
      "C'est une estimation tirée de la forme du texte : force du hook, longueur des phrases, mots de remplissage, boucles de curiosité, fin. Elle sert à comparer deux versions d'un script avant de tourner. La rétention réelle n'existe que dans les statistiques de TikTok ou d'Instagram : note-la dans le Journal pour voir ce qui marche vraiment pour toi.",
  },
  {
    question: "Comment le score viral est-il calculé ?",
    answer:
      "Le simulateur mesure cinq signaux directement dans ton navigateur : la force du hook, le rythme des phrases, la tension entretenue, la clarté du propos et la chute. C'est une estimation instantanée de la forme de ton script, pas une prédiction de vues.",
  },
  {
    question: "Qu'est-ce qu'un crédit ?",
    answer: `Un crédit correspond à une génération par l'IA : un Blueprint, un clonage de structure, une analyse Anti-Dropoff, une série de 7 scripts ou dix accroches. Tu reçois ${FREE_CREDITS} crédits à l'inscription. Une génération qui échoue ne coûte rien. La Courbe de rétention, le Studio et le Journal ne consomment aucun crédit.`,
  },
  {
    question: "Pro vaut-il le coup si je publie peu ?",
    answer:
      "Honnêtement : si tu publies moins d'une vidéo par semaine, le plan gratuit et les outils illimités (courbe, studio, journal) peuvent suffire. Pro sert quand tu publies souvent : tu génères autant de scripts, d'accroches et de blueprints que tu veux, et le Journal t'en dit plus à chaque vidéo notée.",
  },
  {
    question: "Comment s'active le plan Pro ?",
    answer:
      "Tout seul. Paie avec l'adresse e-mail de ton compte ViralForge : dès que le paiement est validé, ton compte passe en Pro. Recharge simplement la page.",
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
    question: "Puis-je annuler le plan Pro ?",
    answer:
      "Oui, à tout moment, depuis ton compte Whop. L'abonnement est sans engagement et tu gardes l'accès illimité jusqu'à la fin de la période payée.",
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
