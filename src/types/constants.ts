import sun from "../assets//fruits/sun.svg";
import moon from "../assets/fruits/moon.svg";
import dryFruits from "../assets/images/dry-fruits.png";
import dietPlan from "../assets/images/diet-plan.png";
import premiumSourcing from "../assets/images/premium-sourcing.png";
import hygienicKitchen from "../assets/images/hygienic-kitchen.png";
import safePackaging from "../assets/images/safe-packaging.png";
import delivery from "../assets/images/delivery.png";
import whatsapp from "../assets/images/whatsapp.png";
import email from "../assets/images/email.png";
import location from "../assets/images/location.png";
import gymPlan from "../assets/images/gym.png";
import dairyProducts from "../assets/images/dairy.png";
import {
  Leaf,
  Truck,
  ShieldCheck,
  Clock3,
} from "lucide-react";

export const Hero_Description = "Premium mix fruit, dry fruit & salad delivered fresh to your doorstep. Experience the taste of health with our daily delivery service.";

export const freshChoicesData = [
  {
    id: 1,
    icon: Leaf,
    title: "Farm Fresh",
    description:
      "Freshly harvested fruits sourced directly from trusted farms every day.",
  },
  {
    id: 2,
    icon: Truck,
    title: "Fast Delivery",
    description:
      "Lightning-fast doorstep delivery while maintaining freshness.",
  },
  {
    id: 3,
    icon: ShieldCheck,
    title: "Premium Quality",
    description:
      "Every fruit is handpicked and quality checked before delivery.",
  },
  {
    id: 4,
    icon: Clock3,
    title: "Daily Delivery",
    description:
      "Choose a convenient delivery slot that fits your schedule.",
  },
];

export const deliveryLocationsData = [
  "Uppal",
  "ECIL",
  "LB Nagar",
  "Tarnaka",
  "Dammaiguda",
  "19 More",
];

export const deliverySlots = [
  {
    id: 1,
    icon: sun,
    time: "8:00 AM to 12:00 PM",
    type: "morning",
  },
  {
    id: 2,
    icon: moon,
    time: "5:00 PM to 11:59 PM",
    type: "night",
  },
];

export const offerings = [
  {
    id: 1,
    number: "01",
    image: dryFruits,
    title: "Premium Dry Fruits",
    description:
      "A carefully selected range of premium nuts, dry fruits and seeds, packed fresh for wholesome everyday snacking.",
  },
  {
    id: 2,
    number: "02",
    image: gymPlan,
    title: "Personalized Gym Plans",
    description:
      "Structured workout plans designed to support your fitness journey with simple routines, clear goals and consistent progress.",
  },
  {
    id: 3,
    number: "03",
    image: dairyProducts,
    title: "Fresh Dairy Products",
    description:
      "Fresh and quality dairy essentials selected to bring wholesome nutrition and everyday goodness to your table.",
  },
  {
    id: 4,
    number: "04",
    image: dietPlan,
    title: "Custom Diet Plans",
    description:
      "Personalized nutrition plans designed around your lifestyle, food preferences and everyday wellness goals.",
  },
];

export const testimonialData = [
    {
        id: 1,
        name: "Ananya Reddy",
        location: "Hyderabad",
        initials: "AR",
        review:
            "Fruveto has completely changed the way we enjoy healthy food at home. Everything feels fresh, thoughtful and genuinely high quality.",
    },
    {
        id: 2,
        name: "Rahul Sharma",
        location: "Hyderabad",
        initials: "RS",
        review:
            "Fruveto has made healthy snacking much easier for us. The quality is consistent and the fruit selection is excellent.",
    },
    {
        id: 3,
        name: "Priya Nair",
        location: "Secunderabad",
        initials: "PN",
        review:
            "I ordered a fruit box for my family and everyone loved it. Fresh ingredients, neat packaging and a very smooth experience.",
    },
    {
        id: 4,
        name: "Karthik Varma",
        location: "Kondapur",
        initials: "KV",
        review:
            "The freshness really stands out. Fruveto feels like a brand that genuinely cares about what it delivers to customers.",
    },
    {
        id: 5,
        name: "Sneha Kapoor",
        location: "Gachibowli",
        initials: "SK",
        review:
            "Perfect option when you want something healthy without spending time preparing it yourself. Everything arrived fresh and ready to enjoy.",
    },
    {
        id: 6,
        name: "Arjun Mehta",
        location: "Madhapur",
        initials: "AM",
        review:
            "Great taste, fresh fruits and reliable delivery. Fruveto has become one of our regular choices for healthy food at home.",
    },
];

export const aboutUsContent = [
  "Fruveto was created with a simple goal—to make fresh, nutritious, and quality food choices easier to bring into everyday life. From fresh fruits to wholesome products, we focus on delivering goodness that you can enjoy with confidence.",

  "We carefully select our products from trusted sources and follow thoughtful handling, packaging, and delivery practices to preserve freshness and quality. By combining convenience with a strong focus on customer experience, we make healthy choices easier and more accessible.",

  "Every Fruveto order represents our commitment to freshness, quality, and care. Whether you're choosing something for your family, your fitness routine, or simply a healthier lifestyle, we're here to make every choice a little fresher and better."
];

export const qualityPromiseData = [
  {
    id: 1,
    image: premiumSourcing,
    title: "Carefully Sourced",
    description:
      "We work with trusted sources and carefully select products based on freshness, quality, and overall value, so you receive products you can feel good about.",
  },
  {
    id: 2,
    image: hygienicKitchen,
    title: "Hygiene & Care",
    description:
      "Every product is handled with care through clean and hygienic preparation practices. We follow thoughtful processes to maintain quality from preparation to packing.",
  },
  {
    id: 3,
    image: safePackaging,
    title: "Freshly Packed",
    description:
      "Our products are packed using food-safe materials and handled carefully to protect their freshness, quality, and presentation until they reach your doorstep.",
  },
];

export const contactInfo = [
  {
    id: 1,
    icon: delivery,
    title: "Delivery Time",
    text1: "Morning : 8 AM to 12 PM",
    text2: "Evening : 5 PM to 11:59 PM",
  },
  {
    id: 2,
    icon:  whatsapp,
    title: "WhatsApp Us",
    text1: "+91 80745 95152"
  },
  {
    id: 3,
    icon: email,
    title: "Email Us",
    text1: "contact@fruveto.com",
    text2: "Our team will get back to you",
  },
  {
    id: 4,
    icon: location,
    title: "Location",
    text1: "Hyderabad, Telangana, India",
    text2: "500062",
  },
];