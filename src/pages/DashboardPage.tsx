import { Link } from "react-router-dom";
import "../styles/admin-ecommerce.css";
/** Customer-only dashboard. Sellers and delivery staff are not user roles. */
export function DashboardPage() {
  return <main className="ec-react-page"><div className="ec-react-heading"><div>
    <span className="ec-react-eyebrow">Your account</span><h1>My Dashboard</h1>
    <p>Shop, review your orders, and manage your addresses.</p>
  </div></div><nav className="ec-react-links" aria-label="Account actions">
    <Link to="/profile">👤 My Profile</Link>
    <Link to="/categories">🛍️ Browse Products</Link>
    <Link to="/orders">📦 My Orders</Link>
    <Link to="/cart">🛒 My Cart</Link>
    <Link to="/addresses">📍 My Addresses</Link>
    <Link to="/support/tickets">💬 Customer Support</Link>
  </nav></main>;
}
