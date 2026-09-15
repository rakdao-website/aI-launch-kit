import { z } from "zod";

const requiredText = (label: string, minimum: number, maximum: number) =>
  z.string()
    .trim()
    .min(minimum, `${label} must be at least ${minimum} characters.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

const optionalText = (label: string, minimum: number, maximum: number) =>
  z.string()
    .trim()
    .max(maximum, `${label} must be ${maximum} characters or fewer.`)
    .refine(
      (value) => value.length === 0 || value.length >= minimum,
      `${label} must be at least ${minimum} characters when provided.`,
    );

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address.")
    .max(254),
});

export const otpSchema = z.object({
  code: z.string()
    .regex(/^\d{6}$/, "Enter the complete 6-digit code."),
});

export const questionnaireSchema = z.object({
  companyName: requiredText("Company or brand name", 2, 120),
  industry: requiredText("Business category", 2, 200),
  customers: requiredText("Customer description", 3, 500),
  tagline: optionalText("Tagline", 3, 160),
});

export const designSelectionSchema = z.object({
  categoryId: z.string().trim().min(1, "Choose a business category."),
  moodId: z.string().trim().min(1, "Choose a design mood."),
  animationId: z.string().trim().min(1, "Choose an animation level."),
});

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a 6-digit hex color such as #6FCCDD.");

export const customPaletteSchema = z.object({
  primary: hexColorSchema,
  secondary: hexColorSchema,
  background: hexColorSchema,
  text: hexColorSchema,
});

export const customFontsSchema = z.object({
  heading: requiredText("Heading font", 2, 100),
  body: requiredText("Body font", 2, 100),
});

export const colorFontSchema = z.object({
  paletteId: z.string().trim().min(1, "Choose a color palette."),
  customPalette: customPaletteSchema.nullable(),
  fontPairingId: z.string().trim().min(1, "Choose a font pairing."),
  customFonts: customFontsSchema.nullable(),
}).superRefine((values, context) => {
  if (values.paletteId === "custom" && !values.customPalette) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customPalette"],
      message: "Complete all four custom colors.",
    });
  }
  if (values.fontPairingId === "custom" && !values.customFonts) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customFonts"],
      message: "Choose both custom fonts.",
    });
  }
});

const sectionSchema = z.object({
  id: z.string().trim().min(1),
  templateId: z.string().trim().min(1),
  name: requiredText("Section name", 1, 120),
  locked: z.boolean(),
});

const pageSchema = z.object({
  id: z.string().trim().min(1),
  templateId: z.string().trim().min(1),
  name: requiredText("Page name", 1, 120),
  slug: z.string().trim().min(1, "Every page needs a URL slug.").max(120),
  sections: z.array(sectionSchema).min(3, "Every page needs navigation, content, and a footer."),
}).superRefine((page, context) => {
  if (!page.sections.some((section) => !section.locked)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sections"],
      message: `${page.name} needs at least one content section.`,
    });
  }
  if (!page.sections[0]?.locked || !page.sections.at(-1)?.locked) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sections"],
      message: `${page.name} must keep its navigation and footer.`,
    });
  }
});

export const pageLayoutSchema = z.object({
  pages: z.array(pageSchema)
    .min(1, "Select at least one page.")
    .max(6, "Select no more than six pages."),
}).superRefine((layout, context) => {
  const editableSections = layout.pages.reduce(
    (count, page) => count + page.sections.filter((section) => !section.locked).length,
    0,
  );
  if (editableSections > 24) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pages"],
      message: "Use no more than 24 content sections.",
    });
  }
  const pageIds = layout.pages.map((page) => page.id);
  const slugs = layout.pages.map((page) => page.slug);
  if (new Set(pageIds).size !== pageIds.length || new Set(slugs).size !== slugs.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pages"],
      message: "Each selected page must have a unique ID and URL slug.",
    });
  }
});

export const mockupSelectionSchema = z.object({
  mockupId: z.string().trim().min(1, "Select a design before building."),
});

const BRAND_MAX_BYTES = 1.5 * 1024 * 1024;
const logoExtensions = new Set(["png", "svg", "jpg", "jpeg"]);
const documentExtensions = new Set(["pdf", "docx", "pptx", "txt", "md", "png", "jpg", "jpeg"]);

export const logoFileSchema = z.custom<File>(
  (value) => typeof File !== "undefined" && value instanceof File,
  "Choose a logo file.",
).superRefine((file, context) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!logoExtensions.has(extension)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a PNG, SVG, or JPG logo." });
  }
  if (file.size > BRAND_MAX_BYTES) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "The logo must be 1.5 MB or smaller." });
  }
});

export const brandDocumentFileSchema = z.custom<File>(
  (value) => typeof File !== "undefined" && value instanceof File,
  "Choose a brand document.",
).superRefine((file, context) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!documentExtensions.has(extension)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose PDF, DOCX, PPTX, TXT, Markdown, PNG, or JPEG.",
    });
  }
  if (file.size > BRAND_MAX_BYTES) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each document must be 1.5 MB or smaller.",
    });
  }
});

export const profileFileSchema = brandDocumentFileSchema;

export const websiteUrlSchema = z.string()
  .trim()
  .min(1, "Enter your website address.")
  .max(2048, "The website address is too long.")
  .transform((value) => (value.includes("://") ? value : `https://${value}`))
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        parsed.hostname.includes(".")
      );
    } catch {
      return false;
    }
  }, "Enter a full website address such as https://example.com.");

export type LoginValues = z.infer<typeof loginSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type QuestionnaireValues = z.infer<typeof questionnaireSchema>;
export type DesignSelectionValues = z.infer<typeof designSelectionSchema>;
export type ColorFontValues = z.infer<typeof colorFontSchema>;
export type CustomPaletteValues = z.infer<typeof customPaletteSchema>;
export type PageLayoutValues = z.infer<typeof pageLayoutSchema>;
export type MockupSelectionValues = z.infer<typeof mockupSelectionSchema>;
