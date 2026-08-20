import { Input, Label, Select, Textarea } from "@/components/ui/input";

const VOICE_TONES = [
  "PROFESSIONAL",
  "FRIENDLY",
  "BOLD",
  "EDUCATIONAL",
  "LUXURY",
  "MINIMAL",
  "HUMOROUS",
  "INSPIRATIONAL",
  "TECHNICAL",
] as const;

const DIALECTS = ["NONE", "MSA", "EGYPTIAN", "GULF", "LEVANTINE", "MAGHREBI"] as const;

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export interface BusinessDefaults {
  name?: string;
  industry?: string | null;
  description?: string | null;
  website?: string | null;
  instagram?: string | null;
  location?: string | null;
  targetMarket?: string | null;
  products?: string[];
  services?: string[];
}

export function BusinessFields({ defaults = {} }: { defaults?: BusinessDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Brand name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaults.name} placeholder="Acme Coffee Co." />
      </Field>
      <Field label="Industry" htmlFor="industry">
        <Input id="industry" name="industry" defaultValue={defaults.industry ?? ""} placeholder="Specialty coffee / F&B" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" rows={3} defaultValue={defaults.description ?? ""} placeholder="What does the business do, and what makes it different?" />
        </Field>
      </div>
      <Field label="Website" htmlFor="website">
        <Input id="website" name="website" defaultValue={defaults.website ?? ""} placeholder="https://acme.com" />
      </Field>
      <Field label="Instagram handle" htmlFor="instagram">
        <Input id="instagram" name="instagram" defaultValue={defaults.instagram ?? ""} placeholder="@acmecoffee" />
      </Field>
      <Field label="Location" htmlFor="location">
        <Input id="location" name="location" defaultValue={defaults.location ?? ""} placeholder="Dubai, UAE" />
      </Field>
      <Field label="Target market" htmlFor="targetMarket">
        <Input id="targetMarket" name="targetMarket" defaultValue={defaults.targetMarket ?? ""} placeholder="Urban professionals, 25-40" />
      </Field>
      <Field label="Products (one per line)" htmlFor="products">
        <Textarea id="products" name="products" rows={3} defaultValue={defaults.products?.join("\n") ?? ""} placeholder="Single-origin beans&#10;Cold brew kits" />
      </Field>
      <Field label="Services (one per line)" htmlFor="services">
        <Textarea id="services" name="services" rows={3} defaultValue={defaults.services?.join("\n") ?? ""} placeholder="Wholesale supply&#10;Barista training" />
      </Field>
    </div>
  );
}

export interface AudienceDefaults {
  targetCustomer?: string | null;
  ageRangeMin?: number | null;
  ageRangeMax?: number | null;
  interests?: string[];
  painPoints?: string[];
  desires?: string[];
  buyingBehavior?: string | null;
}

export function AudienceFields({ defaults = {} }: { defaults?: AudienceDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Target customer" htmlFor="targetCustomer">
          <Textarea id="targetCustomer" name="targetCustomer" rows={2} defaultValue={defaults.targetCustomer ?? ""} placeholder="Who are they, in one or two sentences?" />
        </Field>
      </div>
      <Field label="Age range — min" htmlFor="ageRangeMin">
        <Input id="ageRangeMin" name="ageRangeMin" type="number" min={0} max={120} defaultValue={defaults.ageRangeMin ?? ""} />
      </Field>
      <Field label="Age range — max" htmlFor="ageRangeMax">
        <Input id="ageRangeMax" name="ageRangeMax" type="number" min={0} max={120} defaultValue={defaults.ageRangeMax ?? ""} />
      </Field>
      <Field label="Interests (one per line)" htmlFor="interests">
        <Textarea id="interests" name="interests" rows={3} defaultValue={defaults.interests?.join("\n") ?? ""} />
      </Field>
      <Field label="Pain points (one per line)" htmlFor="painPoints">
        <Textarea id="painPoints" name="painPoints" rows={3} defaultValue={defaults.painPoints?.join("\n") ?? ""} />
      </Field>
      <Field label="Desires (one per line)" htmlFor="desires">
        <Textarea id="desires" name="desires" rows={3} defaultValue={defaults.desires?.join("\n") ?? ""} />
      </Field>
      <Field label="Buying behavior" htmlFor="buyingBehavior">
        <Textarea id="buyingBehavior" name="buyingBehavior" rows={3} defaultValue={defaults.buyingBehavior ?? ""} placeholder="How do they discover and decide to buy?" />
      </Field>
    </div>
  );
}

export interface VoiceDefaults {
  primaryTone?: string;
  secondaryTones?: string[];
  customInstructions?: string | null;
}

export function VoiceFields({ defaults = {} }: { defaults?: VoiceDefaults }) {
  return (
    <div className="grid gap-4">
      <Field label="Primary tone" htmlFor="primaryTone">
        <Select id="primaryTone" name="primaryTone" required defaultValue={defaults.primaryTone ?? "FRIENDLY"}>
          {VOICE_TONES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <Label>Secondary tones (optional)</Label>
        <div className="flex flex-wrap gap-3 rounded-[var(--radius-sm)] border border-border p-3">
          {VOICE_TONES.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="secondaryTones"
                value={t}
                defaultChecked={defaults.secondaryTones?.includes(t)}
                className="rounded border-border"
              />
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </div>
      <Field label="Custom voice instructions" htmlFor="customInstructions" hint="Anything else the AI should always keep in mind about how this brand sounds.">
        <Textarea id="customInstructions" name="customInstructions" rows={3} defaultValue={defaults.customInstructions ?? ""} />
      </Field>
    </div>
  );
}

export interface VisualDefaults {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontPrimary?: string | null;
  fontSecondary?: string | null;
  imageStyle?: string | null;
  designReferences?: string[];
}

export function VisualIdentityFields({ defaults = {} }: { defaults?: VisualDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="logo">Logo</Label>
        {defaults.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={defaults.logoUrl} alt="Current logo" className="mb-2 h-12 w-12 rounded border border-border object-contain bg-white p-1" />
        )}
        <input type="file" id="logo" name="logo" accept="image/*" className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm" />
        {defaults.logoUrl && <input type="hidden" name="existingLogoUrl" value={defaults.logoUrl} />}
      </div>
      <Field label="Primary color" htmlFor="primaryColor">
        <div className="flex items-center gap-2">
          <Input id="primaryColor" name="primaryColor" defaultValue={defaults.primaryColor ?? ""} placeholder="#4F46E5" />
        </div>
      </Field>
      <Field label="Secondary color" htmlFor="secondaryColor">
        <Input id="secondaryColor" name="secondaryColor" defaultValue={defaults.secondaryColor ?? ""} placeholder="#111827" />
      </Field>
      <Field label="Accent color" htmlFor="accentColor">
        <Input id="accentColor" name="accentColor" defaultValue={defaults.accentColor ?? ""} placeholder="#F59E0B" />
      </Field>
      <Field label="Image style" htmlFor="imageStyle">
        <Input id="imageStyle" name="imageStyle" defaultValue={defaults.imageStyle ?? ""} placeholder="Warm, natural light, minimal props" />
      </Field>
      <Field label="Primary font" htmlFor="fontPrimary">
        <Input id="fontPrimary" name="fontPrimary" defaultValue={defaults.fontPrimary ?? ""} placeholder="Inter" />
      </Field>
      <Field label="Secondary font" htmlFor="fontSecondary">
        <Input id="fontSecondary" name="fontSecondary" defaultValue={defaults.fontSecondary ?? ""} placeholder="Optional" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Design references (one per line — links or notes)" htmlFor="designReferences">
          <Textarea id="designReferences" name="designReferences" rows={2} defaultValue={defaults.designReferences?.join("\n") ?? ""} />
        </Field>
      </div>
    </div>
  );
}

export interface RulesDefaults {
  wordsToUse?: string[];
  wordsToAvoid?: string[];
  claimsToAvoid?: string[];
  topicsToAvoid?: string[];
  ctaStyle?: string | null;
  hashtagStrategy?: string | null;
  language?: string;
  dialect?: string;
}

export function ContentRulesFields({ defaults = {} }: { defaults?: RulesDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Words/phrases to use" htmlFor="wordsToUse">
        <Textarea id="wordsToUse" name="wordsToUse" rows={3} defaultValue={defaults.wordsToUse?.join("\n") ?? ""} />
      </Field>
      <Field label="Words to avoid" htmlFor="wordsToAvoid">
        <Textarea id="wordsToAvoid" name="wordsToAvoid" rows={3} defaultValue={defaults.wordsToAvoid?.join("\n") ?? ""} />
      </Field>
      <Field label="Claims to avoid" htmlFor="claimsToAvoid">
        <Textarea id="claimsToAvoid" name="claimsToAvoid" rows={3} defaultValue={defaults.claimsToAvoid?.join("\n") ?? ""} />
      </Field>
      <Field label="Topics to avoid" htmlFor="topicsToAvoid">
        <Textarea id="topicsToAvoid" name="topicsToAvoid" rows={3} defaultValue={defaults.topicsToAvoid?.join("\n") ?? ""} />
      </Field>
      <Field label="CTA style" htmlFor="ctaStyle">
        <Input id="ctaStyle" name="ctaStyle" defaultValue={defaults.ctaStyle ?? ""} placeholder="Direct but not pushy — invite, don't demand" />
      </Field>
      <Field label="Hashtag strategy" htmlFor="hashtagStrategy">
        <Input id="hashtagStrategy" name="hashtagStrategy" defaultValue={defaults.hashtagStrategy ?? ""} placeholder="3-5 niche tags + 1 branded tag" />
      </Field>
      <Field label="Language" htmlFor="language">
        <Select id="language" name="language" defaultValue={defaults.language ?? "en"}>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
          <option value="en-ar">English + Arabic</option>
        </Select>
      </Field>
      <Field label="Dialect (if Arabic)" htmlFor="dialect">
        <Select id="dialect" name="dialect" defaultValue={defaults.dialect ?? "NONE"}>
          {DIALECTS.map((d) => (
            <option key={d} value={d}>
              {d === "NONE" ? "N/A" : d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
