import type { ProductKind } from "@/generated/prisma/client";

export const PRODUCT_KINDS: ProductKind[] = [
  "SOFTWARE",
  "EBOOK",
  "COURSE",
  "TEMPLATE",
  "GRAPHICS",
  "AUDIO",
  "VIDEO",
  "FONT",
  "OTHER",
];

export const KIND_LABEL: Record<ProductKind, { one: string; many: string }> = {
  SOFTWARE: { one: "Software", many: "Software" },
  EBOOK: { one: "Ebook", many: "Ebooks" },
  COURSE: { one: "Course", many: "Courses" },
  TEMPLATE: { one: "Template", many: "Templates" },
  GRAPHICS: { one: "Graphics", many: "Graphics" },
  AUDIO: { one: "Audio", many: "Audio" },
  VIDEO: { one: "Video", many: "Video" },
  FONT: { one: "Font", many: "Fonts" },
  OTHER: { one: "Digital product", many: "Other" },
};
