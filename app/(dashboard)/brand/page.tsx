import { requireBrandOrRedirect } from "@/lib/brand/service";
import { listAllMemory } from "@/lib/brand/memory";
import {
  updateBusinessAction,
  updateAudienceAction,
  updateVoiceAction,
  updateVisualIdentityAction,
  updateContentRulesAction,
} from "@/lib/actions/brand-actions";
import { Tabs } from "@/components/ui/tabs";
import {
  BusinessEditForm,
  AudienceEditForm,
  VoiceEditForm,
  VisualIdentityEditForm,
  ContentRulesEditForm,
} from "@/components/brand/edit-forms";
import { MemoryList } from "@/components/brand/memory-list";
import { Card, CardContent } from "@/components/ui/card";

export default async function BrandPage() {
  const { brand } = await requireBrandOrRedirect();
  const memory = await listAllMemory(brand.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Brand Brain</h1>
        <p className="mt-1 text-sm text-muted">
          Everything AURIX knows about {brand.name}. The AI retrieves this before generating any
          content — keep it current.
        </p>
      </div>

      <Tabs
        tabs={[
          {
            key: "business",
            label: "Business",
            content: (
              <Card>
                <CardContent className="pt-5">
                  <BusinessEditForm
                    action={updateBusinessAction}
                    defaults={{
                      name: brand.name,
                      industry: brand.industry,
                      description: brand.description,
                      website: brand.website,
                      instagram: brand.instagram,
                      location: brand.location,
                      targetMarket: brand.targetMarket,
                      products: brand.products,
                      services: brand.services,
                    }}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            key: "audience",
            label: "Audience",
            content: (
              <Card>
                <CardContent className="pt-5">
                  <AudienceEditForm
                    action={updateAudienceAction}
                    defaults={{
                      targetCustomer: brand.audience?.targetCustomer,
                      ageRangeMin: brand.audience?.ageRangeMin,
                      ageRangeMax: brand.audience?.ageRangeMax,
                      interests: brand.audience?.interests,
                      painPoints: brand.audience?.painPoints,
                      desires: brand.audience?.desires,
                      buyingBehavior: brand.audience?.buyingBehavior,
                    }}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            key: "voice",
            label: "Voice",
            content: (
              <Card>
                <CardContent className="pt-5">
                  <VoiceEditForm
                    action={updateVoiceAction}
                    defaults={{
                      primaryTone: brand.voice?.primaryTone,
                      secondaryTones: brand.voice?.secondaryTones,
                      customInstructions: brand.voice?.customInstructions,
                    }}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            key: "visual",
            label: "Visual identity",
            content: (
              <Card>
                <CardContent className="pt-5">
                  <VisualIdentityEditForm
                    action={updateVisualIdentityAction}
                    defaults={{
                      logoUrl: brand.visualIdentity?.logoUrl,
                      primaryColor: brand.visualIdentity?.primaryColor,
                      secondaryColor: brand.visualIdentity?.secondaryColor,
                      accentColor: brand.visualIdentity?.accentColor,
                      fontPrimary: brand.visualIdentity?.fontPrimary,
                      fontSecondary: brand.visualIdentity?.fontSecondary,
                      imageStyle: brand.visualIdentity?.imageStyle,
                      designReferences: brand.visualIdentity?.designReferences,
                    }}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            key: "rules",
            label: "Content rules",
            content: (
              <Card>
                <CardContent className="pt-5">
                  <ContentRulesEditForm
                    action={updateContentRulesAction}
                    defaults={{
                      wordsToUse: brand.contentRules?.wordsToUse,
                      wordsToAvoid: brand.contentRules?.wordsToAvoid,
                      claimsToAvoid: brand.contentRules?.claimsToAvoid,
                      topicsToAvoid: brand.contentRules?.topicsToAvoid,
                      ctaStyle: brand.contentRules?.ctaStyle,
                      hashtagStrategy: brand.contentRules?.hashtagStrategy,
                      language: brand.contentRules?.language,
                      dialect: brand.contentRules?.dialect,
                    }}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            key: "memory",
            label: "Brand memory",
            content: <MemoryList entries={memory} />,
          },
        ]}
      />
    </div>
  );
}
