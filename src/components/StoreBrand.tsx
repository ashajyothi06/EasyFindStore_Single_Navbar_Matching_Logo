import { Link } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import "../styles/store-brand.css";

type StoreBrandProps = {
  to?: string;
  className?: string;
  onClick?: () => void;
};

/** Shared storefront logo for the header and footer. */
export function StoreBrand({ to = "/", className = "", onClick }: StoreBrandProps) {
  return (
    <Link to={to} onClick={onClick} className={`efs2-brand efs-shared-brand ${className}`.trim()} aria-label="EasyFindStore home">
      <span className="efs2-bag" aria-hidden="true"><FiShoppingCart /></span>
      <span className="efs2-brand-words"><strong>EasyFind<span>Store</span></strong></span>
    </Link>
  );
}
