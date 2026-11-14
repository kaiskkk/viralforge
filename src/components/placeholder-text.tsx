/** Affiche un texte en surlignant les emplacements à compléter (« [X] », « [ton chiffre] »). */
export function PlaceholderText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]{1,40}\])/g);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded bg-warn/15 px-1 font-medium text-warn" title="À compléter avec ton vrai chiffre">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
