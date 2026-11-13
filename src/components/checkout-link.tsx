import { CHECKOUT_URL } from "@/lib/plans";

/**
 * Lien vers la page de paiement du plan Pro.
 * S'ouvre dans un nouvel onglet : l'utilisateur ne perd pas le script
 * affiché dans le dashboard pendant qu'il paie.
 */
export function CheckoutLink({
  href = CHECKOUT_URL,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  );
}
