export type SKUCategory =
  | "core"
  | "design"
  | "seo"
  | "content"
  | "functional"
  | "integrations"
  | "media";

export interface SKU {
  id: string;
  title: string;
  category: SKUCategory;
  description: string;
  basePrice: number;
  unit?: "fixed" | "perPage" | "perLang" | "perProduct";
  unitPrice?: number;
  constraints?: { requires?: string[]; excludes?: string[] };
  tags?: string[];
}

export const SKU_RESPONSIVE = "design.responsive";

export const catalog: SKU[] = [
  // CORE
  {
    id: "site.onepage",
    title: "Landing one-page",
    category: "core",
    description: "Secciones: quiénes somos, horarios, ubicación y contacto.",
    basePrice: 600,
    tags: ["landing", "onepage"],
  },

  {
    id: "site.multipage",
    title: "Web multi-página",
    category: "core",
    description: "Estructura multi-página escalable.",
    basePrice: 800,
    unit: "perPage",
    unitPrice: 80,
    tags: ["corporativa"],
  },

  // DESIGN
  {
    id: "design.responsive",
    title: "Diseño responsive",
    category: "design",
    description: "Mobile-first, limpio y moderno.",
    basePrice: 150,
  },

  // CONTACTO / MAPA
  {
    id: "functional.contactForm",
    title: "Formulario de contacto",
    category: "functional",
    description: "Validación + envío a email.",
    basePrice: 120,
    tags: ["contacto"],
  },
  {
    id: "functional.whatsapp",
    title: "Botones WhatsApp/llamada",
    category: "functional",
    description: "CTA directo para conversiones.",
    basePrice: 60,
  },
  {
    id: "functional.map",
    title: "Mapa interactivo",
    category: "functional",
    description: "Mapa con ubicación/POIs.",
    basePrice: 80,
  },

  // SEO/IDIOMAS/CONTENIDO
  {
    id: "seo.local",
    title: "SEO local",
    category: "seo",
    description: "On-page básico + metadatos + schema local.",
    basePrice: 180,
    tags: ["seo", "local"],
  },
  {
    id: "content.faq",
    title: "Página FAQ",
    category: "content",
    description: "FAQs editables.",
    basePrice: 90,
  },
  {
    id: "i18n.bilingual",
    title: "Segundo idioma",
    category: "content",
    description: "Estructura bilingüe.",
    basePrice: 120,
    unit: "perLang",
    unitPrice: 80,
  },
  {
    id: "integrations.gbp",
    title: "Google Business Profile",
    category: "integrations",
    description: "Alta/optimización GBP.",
    basePrice: 120,
  },

  // E-COMMERCE (opcional, activa perProduct en UI)
  {
    id: "ecom.catalog",
    title: "Catálogo e-commerce",
    category: "functional",
    description:
      "Listado y fichas de producto (dimensión por nº de productos).",
    basePrice: 300,
    unit: "perProduct",
    unitPrice: 5,
    tags: ["ecommerce", "tienda", "producto"],
  },

  // PREMIUM EXTRAS
  {
    id: "media.photosession",
    title: "Sesión de foto y vídeo",
    category: "media",
    description: "Cobertura profesional local.",
    basePrice: 350,
  },
  {
    id: "content.testimonials",
    title: "Opiniones y testimonios",
    category: "content",
    description: "Sección de reviews.",
    basePrice: 100,
  },
  {
    id: "content.blog",
    title: "Blog",
    category: "content",
    description: "CMS + listados + post.",
    basePrice: 220,
  },
  {
    id: "content.privateArea",
    title: "Área privada (recursos)",
    category: "content",
    description: "Descargas, PDFs, links.",
    basePrice: 200,
  },
  {
    id: "functional.booking",
    title: "Reservas y pagos online",
    category: "functional",
    description: "Clases/Matriculas (pasarela).",
    basePrice: 260,
    constraints: { requires: ["content.menus.basic"] },
  },

  // DEPENDENCIAS COMUNES
  {
    id: "content.menus.basic",
    title: "Navegación/menús",
    category: "content",
    description: "Header/Footer y rutas.",
    basePrice: 60,
  },
];
