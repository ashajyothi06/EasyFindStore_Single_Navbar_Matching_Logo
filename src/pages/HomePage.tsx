import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiGrid, FiShoppingBag, FiStar, FiTruck, FiShield, FiHeadphones, FiPackage, FiZap } from "react-icons/fi";
import { HomeHero } from "../components/HomeHero";
import { fetchCatalog } from "../lib/guestCart";
import { productDetailHref } from "../lib/productLinks";
import type { CatalogCategory, CatalogItem } from "../services/coreCommerceApi";
import "../styles/royal-home.css";
import "../styles/easyfindstore-home.css";
import "../styles/easyfindstore-refresh.css";
import "../styles/easyfindstore-luxe.css";
import "../styles/easyfindstore-reference.css";
import menPic from "../assets/easyfind/men.jpg";
import womenPic from "../assets/easyfind/women.jpg";
import kidsPic from "../assets/easyfind/kids.jpg";
import electronicsPic from "../assets/easyfind/electronics-category.jpg";
import homePic from "../assets/easyfind/home-category.jpg";
import beautyPic from "../assets/easyfind/beauty.jpg";
import sportsPic from "../assets/easyfind/sports.jpg";
import booksPic from "../assets/easyfind/books.jpg";
import lifestylePic from "../assets/easyfind/home-lifestyle.jpg";
import fashionPic from "../assets/easyfind/men.jpg";

type StoreProduct = { category: CatalogCategory; item: CatalogItem };
const PRODUCT_LIMIT = 8;
// Editorial product imagery, independent of the live catalogue. Never assign demo photos
// or prices to a real product — genuine listings continue to use their API images.
// Homepage browsing taxonomy is independent of old backend category names.
// Each collection is a browse-only preview; only real API products have prices/details.
const retailDepartments = [
  { id: "fashion", label: "Fashion", image: menPic, title: "Everyday fashion", keyword: /fashion|clothing|apparel|garment|shirt|tshirt|t-shirt|jacket|jeans|trouser|dress|kurta|saree|sari|footwear|shoe|sneaker|handbag|wallet|men'?s|women'?s|kids? wear/i },
  { id: "electronics", label: "Electronics", image: electronicsPic, title: "Gadgets & audio", keyword: /electronic|audio|headphone|earphone|earbud|speaker|gadget|tech|laptop|computer|mobile|phone|tablet|smartwatch|smart watch|camera|charger|television|\btv\b/i },
  { id: "home", label: "Home & Kitchen", image: homePic, title: "Home essentials", keyword: /home|kitchen|cook|appliance|furniture|decor|décor|sofa|lamp|mixer|grinder|blender|air fryer|bedding|bedsheet|utensil|cookware/i },
  { id: "beauty", label: "Beauty & Care", image: beautyPic, title: "Beauty essentials", keyword: /beauty|skin|cosmetic|personal care|haircare|shampoo|serum|moisturiz|makeup|perfume|fragrance|lipstick/i },
  { id: "sports", label: "Sports & Fitness", image: sportsPic, title: "Fitness & outdoors", keyword: /sport|fitness|gym|workout|yoga|dumbbell|exercise|cycling|outdoor|cricket|football|badminton/i },
  { id: "books", label: "Books & More", image: booksPic, title: "Books & stationery", keyword: /book|stationery|reading|notebook|pen|pencil|school|office supplies/i },
  { id: "kids", label: "Kids & Toys", image: kidsPic, title: "Kids' favourites", keyword: /kids|baby|child|toy|game|teddy|puzzle|infant/i },
  { id: "lifestyle", label: "Lifestyle", image: lifestylePic, title: "Lifestyle finds", keyword: /lifestyle|travel|luggage|backpack|bag|accessor|watch|jewellery|jewelry|sunglass/i },
] as const;
const LEGACY_POOJA_TERMS = /pooja|puja|rudraksha|diya|devotion|spiritual|samagri|religious|ganesh|temple|incense|agarbatti|pujan|idol|camphor|kapoor|frame|photo frame|murti|god statue|havan|kumkum|vibhuti|aarti|puja kit|brass bell|kalash|dhoop|chandan|god photo/i;
function retailDepartmentFor(categoryName: string, item: CatalogItem) {
  const value = `${categoryName} ${item.name} ${item.group_name ?? ""}`;
  // Old pooja stock is not retail demo merchandise, even if a generic root category matches.
  if (LEGACY_POOJA_TERMS.test(value)) return null;
  return retailDepartments.find(department => department.keyword.test(value))?.id ?? null;
}
const CACHE_DURATION = 45_000;
const editorialCategories = [
  { name: "Fashion", image: menPic },
  { name: "Electronics", image: electronicsPic },
  { name: "Home Décor", image: lifestylePic },
  { name: "Beauty & Personal Care", image: beautyPic },
  { name: "Sports & Outdoors", image: sportsPic },
  { name: "Toys & Games", image: kidsPic },
  { name: "Kitchen & Dining", image: homePic },
  { name: "Books & Media", image: booksPic },
  { name: "Watches & Jewelry", image: womenPic },
  { name: "Deals & Offers", image: fashionPic },
];
let cachedCatalog: { categories: CatalogCategory[]; time: number } | undefined;
let pendingCatalog: Promise<CatalogCategory[]> | undefined;

function loadCatalog(): Promise<CatalogCategory[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.time < CACHE_DURATION) {
    return Promise.resolve(cachedCatalog.categories);
  }
  if (!pendingCatalog) {
    pendingCatalog = fetchCatalog().then(categories => {
      const active = categories.filter(category => category.is_active !== false);
      cachedCatalog = { categories: active, time: Date.now() };
      return active;
    }).finally(() => { pendingCatalog = undefined; });
  }
  return pendingCatalog;
}

function getHomeProducts(categories: CatalogCategory[]) {
  const byId = new Map(categories.map(category => [category.id, category]));
  const grouped = new Map<string, StoreProduct[]>();
  const all: StoreProduct[] = [];
  for (const category of categories) {
    let root = category;
    const seen = new Set<string>();
    while (root.parent_id && byId.has(root.parent_id) && !seen.has(root.id)) {
      seen.add(root.id);
      root = byId.get(root.parent_id)!;
    }
    if (LEGACY_POOJA_TERMS.test(root.name) || LEGACY_POOJA_TERMS.test(category.name)) continue;
    for (const item of category.items || []) {
      if (item.is_active === false) continue;
      const department = retailDepartmentFor(`${root.name} ${category.name}`, item);
      if (!department) continue;
      const product = { category, item };
      all.push(product);
      const group = grouped.get(department) ?? [];
      group.push(product);
      grouped.set(department, group);
    }
  }
  const sortFeatured = (products: StoreProduct[]) => [...products]
    .sort((a, b) => Number(Boolean(b.item.is_featured)) - Number(Boolean(a.item.is_featured)))
    .slice(0, PRODUCT_LIMIT);
  return {
    all: sortFeatured(all),
    groups: new Map([...grouped.entries()].map(([id, products]) => [id, sortFeatured(products)])),
  };
}

function ProductImage({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return src && !failed
    ? <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span className="efs-product-fallback"><FiShoppingBag aria-hidden="true" /></span>;
}

export function HomePage() {
  const [categories, setCategories] = useState<CatalogCategory[]>(() => cachedCatalog?.categories ?? []);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    loadCatalog().then(data => {
      if (mounted) { setCategories(data); setLoading(false); }
    }).catch(() => {
      if (mounted) { setLoading(false); setError(true); }
    });
    return () => { mounted = false; };
  }, []);
  const products = useMemo(() => getHomeProducts(categories), [categories]);
  const visible = filter === "all" ? products.all : products.groups.get(filter) ?? [];
  const categoryLinks = editorialCategories.map(category => ({
    ...category,
    departmentId: ({
      "Fashion": "fashion", "Electronics": "electronics", "Home Décor": "home",
      "Beauty & Personal Care": "beauty", "Sports & Outdoors": "sports",
      "Toys & Games": "kids", "Kitchen & Dining": "home", "Books & Media": "books",
      "Watches & Jewelry": "lifestyle", "Deals & Offers": "all",
    } as Record<string,string>)[category.name] ?? "all"
  }));

  const selectDepartment = (departmentId: string) => {
    setFilter(departmentId);
    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const promotionalCards = [
    { kicker: "Fashion Edit", headline: "Up to 60% OFF", text: "Apparel · Footwear · Accessories", image: fashionPic, href: "/store?search=fashion", button: "Shop Fashion", theme: "fashion" },
    { kicker: "Latest Electronics", headline: "Up to 50% OFF", text: "Mobiles · Laptops · Wearables · More", image: electronicsPic, href: "/store?search=electronics", button: "Shop Electronics", theme: "electronics" },
    { kicker: "Home Décor Essentials", headline: "Up to 55% OFF", text: "Furniture · Lighting · Décor · More", image: lifestylePic, href: "/store?search=home", button: "Shop Home Décor", theme: "home" },
  ];
  const preview = retailDepartments.filter(dept => filter === "all" || filter === dept.id).slice(0, 6);
  return (
    <main className="royal-home royal-home-wide efs-new-home efs2-home">
      <HomeHero />
      <section className="efs2-promotions" aria-label="Shop popular collections">
        {promotionalCards.map(card => <Link key={card.theme} to={card.href} className={`efs2-promo efs2-promo-${card.theme}`}>
          <div className="efs2-promo-image"><img src={card.image} alt={`${card.kicker} collection`} loading="lazy" decoding="async" /></div>
          <div className="efs2-promo-copy"><strong>{card.kicker}</strong><h2>{card.headline}</h2><p>{card.text}</p><span>{card.button} <FiArrowRight /></span></div>
        </Link>)}
      </section>
      <section className="efs2-trust-strip" aria-label="Shopping features">
        <div><FiTruck /><span><strong>Fast & Reliable Delivery</strong><small>Tracking with every order</small></span></div>
        <div><FiStar /><span><strong>Shop Great Collections</strong><small>Discover something new</small></span></div>
        <div><FiShield /><span><strong>Secure Payments</strong><small>Multiple safe options</small></span></div>
        <div><FiPackage /><span><strong>Easy Order Tracking</strong><small>Manage your purchases</small></span></div>
        <div><FiHeadphones /><span><strong>Dedicated Support</strong><small>We're here to help</small></span></div>
      </section>
      <section className="efs2-section efs2-categories" id="categories">
        <div className="efs2-section-heading"><h2>Shop by Category</h2><Link to="/categories">View All Categories <FiArrowRight /></Link></div>
        <div className="efs2-category-grid">{categoryLinks.map(category => <button type="button" key={category.name} className="efs2-category-card" onClick={() => selectDepartment(category.departmentId)}><img src={category.image} alt="" loading="lazy" decoding="async"/><strong>{category.name}</strong></button>)}</div>
      </section>
      <section className="efs2-section efs2-featured" id="featured-products">
        <div className="efs2-section-heading"><div className="efs2-title-group"><FiZap /><h2>Featured Deals</h2><span>Curated collections</span></div><Link to="/store">View All Deals <FiArrowRight /></Link></div>
        <div className="efs2-filters" role="group" aria-label="Filter featured products">
          <button type="button" aria-pressed={filter === "all"} onClick={()=>setFilter("all")}><FiGrid /> All Products</button>
          {retailDepartments.map(dept => <button type="button" key={dept.id} aria-pressed={filter===dept.id} onClick={()=>setFilter(dept.id)}>{dept.label}</button>)}
        </div>
        {visible.length > 0 ? <div className="efs2-product-grid">
          {visible.map(({item}) => {
            const price = Number(item.price || 0);
            const previous = Math.max(price, Number(item.compare_price || 0), Number(item.regular_price || 0));
            const discount = previous > price && price > 0 ? Math.round((previous - price) / previous * 100) : 0;
            return <Link to={productDetailHref(item.id)} key={item.id} className="efs2-product-card">
              <div className="efs2-product-photo"><ProductImage src={item.image_url} name={item.name}/>{discount>0 && <span className="efs2-discount">-{discount}%</span>}</div>
              <div className="efs2-product-info"><h3>{item.name}</h3><div><strong>₹{price.toLocaleString("en-IN")}</strong>{previous>price && <del>₹{previous.toLocaleString("en-IN")}</del>}<span className="efs2-cart-badge"><FiShoppingBag/></span></div></div>
            </Link>;
          })}
        </div> : <div className="efs2-preview-grid" aria-label="Explore retail departments">
          {preview.map(dept => <Link key={dept.id} to={`/store?search=${encodeURIComponent(dept.label)}`} className="efs2-preview-card">
            <div className="efs2-preview-image"><img src={dept.image} alt={dept.label} loading="lazy" decoding="async" /></div>
            <span>Explore Collection</span><h3>{dept.label}</h3><div>Shop collection <FiArrowRight/></div>
          </Link>)}
        </div>}
        {loading && <p className="efs2-store-message" role="status">Loading available products…</p>}
        {error && <p className="efs2-store-message" role="status">The live catalogue is unavailable right now. <Link to="/store">Explore the store</Link></p>}
        {!loading && !error && !visible.length && <p className="efs2-store-message">Collection previews shown above. Add inventory through your admin catalogue to display real product names, images and prices here.</p>}
      </section>
    </main>
  );
}
