import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import fashionImage from "../assets/easyfind/hero-fashion-original.jpg";
import electronicsImage from "../assets/easyfind/hero-electronics-original.jpg";
import homeImage from "../assets/easyfind/hero-home-original.jpg";

const slides = [
  { label: "CURATED COLLECTIONS", title: "Style · Tech · Home", description: "Explore fashion, electronics and home essentials in one place.", image: fashionImage, button: "Shop the Collection", href: "/store", mode: "fashion" },
  { label: "TECH MADE SIMPLE", title: "Discover Everyday Tech", description: "Find headphones, wearables and accessories for your daily routine.", image: electronicsImage, button: "Explore Electronics", href: "/store?search=electronics", mode: "tech" },
  { label: "HOME & KITCHEN", title: "Refresh Your Space", description: "Beautiful and practical picks for a home that feels like yours.", image: homeImage, button: "Shop Home Essentials", href: "/store?search=home", mode: "home" },
];

export function HomeHero() {
  const [active, setActive] = useState(0);
  const move = (offset: number) => setActive(current => (current + offset + slides.length) % slides.length);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive(current => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="efs2-hero" aria-label="Featured store collections">
    {slides.map((slide, index) => <article key={slide.label} className={`efs2-hero-slide efs2-slide-${slide.mode} ${index === active ? "is-active" : ""}`} aria-hidden={index !== active}>
      <div className="efs2-hero-copy"><span className="efs2-eyebrow">{slide.label}</span><h1>{slide.title}</h1><p>{slide.description}</p><Link to={slide.href} tabIndex={active===index ? 0 : -1} className="efs2-gold-button">{slide.button} <FiArrowRight /></Link></div>
      <div className="efs2-hero-art"><img src={slide.image} alt={`${slide.label.toLowerCase()} campaign photography`} fetchPriority={index===0 ? "high" : "auto"}/></div>
    </article>)}
    <button type="button" className="efs2-hero-prev" aria-label="Previous promotion" onClick={()=>move(-1)}><FiChevronLeft/></button>
    <button type="button" className="efs2-hero-next" aria-label="Next promotion" onClick={()=>move(1)}><FiChevronRight/></button>
    <div className="efs2-hero-dots" aria-label="Select promotion">{slides.map((slide,index) => <button type="button" key={slide.label} aria-label={`Slide ${index+1}`} aria-current={active===index} onClick={()=>setActive(index)}/>)}</div>
  </section>;
}
