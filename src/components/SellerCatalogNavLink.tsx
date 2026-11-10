import { Link } from "react-router-dom";

interface SellerCatalogNavLinkProps {
  isSeller: boolean;
  enabled?: boolean;
  selectedItemCount?: number;
  managePath?: string;
  className?: string;
  onNavigate?: () => void;
}

export function SellerCatalogNavLink({
  isSeller,
  enabled = true,
  selectedItemCount = 0,
  managePath = "/seller/catalog-selection",
  className,
  onNavigate,
}: SellerCatalogNavLinkProps) {
  if (!isSeller || !enabled) {
    return null;
  }

  return (
    <Link
      className={className}
      to={managePath}
      onClick={onNavigate}
    >
      My Catalogue
      {selectedItemCount > 0
        ? ` (${selectedItemCount})`
        : ""}
    </Link>
  );
}
