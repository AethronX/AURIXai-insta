/**
 * Demo seed data for AURIX Social AI. Populates a realistic brand ("Acme Coffee Co") spanning the
 * full content lifecycle so the dashboard, calendar, content studio, and analytics all look
 * populated immediately — every seeded row is marked `isSeedData: true` where the schema supports
 * it, and is clearly a fictional example brand.
 *
 * This script talks to Prisma directly (not the lib/**\/*.ts service layer) because most of that
 * layer is marked `import "server-only"`, which only resolves inside Next's server bundler — not
 * under plain `tsx` execution. Seed scripts writing directly via Prisma is also just the normal
 * pattern for seeding.
 */
import { PrismaClient, type ContentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = "acme-coffee-demo";
const DEMO_EMAIL = "demo@aurix.ai";
const DEMO_PASSWORD = "demo12345";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function writePlaceholderImage(key: string, label: string, from: string, to: string): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" /><stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)" />
  <text x="50%" y="50%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="52" font-weight="600" fill="#ffffff">${label}</text>
  <text x="24" y="1056" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#ffffffaa">AURIX seed data — example image</text>
</svg>`;
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, svg);
  return `/uploads/${key}`;
}

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (existing) {
    console.log(`Removing existing demo org (${DEMO_ORG_SLUG}) to reseed cleanly…`);
    await prisma.organization.delete({ where: { id: existing.id } });
  }

  console.log("Creating demo organization, user, and brand…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const org = await prisma.organization.create({
    data: { name: "Acme Coffee Co", slug: DEMO_ORG_SLUG, plan: "PRO" },
  });

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash, name: "Jordan (Demo Owner)" },
  });

  await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });

  const brand = await prisma.brand.create({
    data: {
      organizationId: org.id,
      name: "Acme Coffee Co",
      industry: "Specialty coffee roaster & café",
      description:
        "A third-wave specialty coffee roaster with two café locations. Sources single-origin beans directly from small farms and roasts in small batches weekly.",
      website: "https://acmecoffee.example.com",
      instagram: "@acmecoffeeco",
      location: "Portland, OR",
      products: ["Single-origin beans", "Cold brew kits", "Seasonal blends", "Merch (mugs, tote bags)"],
      services: ["Wholesale supply", "Barista training", "Café dine-in"],
      targetMarket: "Urban coffee enthusiasts, 24-40, who care about sourcing and craft",
      onboardingCompletedAt: new Date(),
      isSeedData: true,
      audience: {
        create: {
          targetCustomer: "Young professionals and remote workers who treat coffee as a daily ritual, not just caffeine.",
          ageRangeMin: 24,
          ageRangeMax: 40,
          interests: ["Specialty coffee", "Sustainability", "Third-wave brewing", "Local food scene"],
          painPoints: ["Bad coffee at the office", "Not knowing how to brew well at home", "Generic chain coffee fatigue"],
          desires: ["Feel like a coffee connoisseur", "Support ethically-sourced small business", "A daily ritual worth savoring"],
          buyingBehavior: "Discovers via Instagram and word of mouth; converts via in-café visits and subscription.",
        },
      },
      voice: {
        create: {
          primaryTone: "FRIENDLY",
          secondaryTones: ["EDUCATIONAL", "INSPIRATIONAL"],
          customInstructions: "Warm and knowledgeable, like a barista who genuinely loves talking about coffee — never corporate, never pushy.",
        },
      },
      visualIdentity: {
        create: {
          primaryColor: "#6F4E37",
          secondaryColor: "#2B1B12",
          accentColor: "#E8B04B",
          fontPrimary: "Inter",
          fontSecondary: "Georgia",
          imageStyle: "Warm natural light, close-up textures, minimal props, matte earthy tones",
          designReferences: ["Blue Bottle Coffee IG aesthetic", "Warm editorial food photography"],
        },
      },
      contentRules: {
        create: {
          wordsToUse: ["small-batch", "single-origin", "craft", "ritual"],
          wordsToAvoid: ["cheap", "instant", "generic"],
          claimsToAvoid: ["cures fatigue", "healthiest coffee in the world"],
          topicsToAvoid: ["politics", "competitor bashing"],
          ctaStyle: "Warm and inviting — invite, don't demand.",
          hashtagStrategy: "3-5 niche coffee/sustainability tags + 1 branded tag (#AcmeCoffeeCo).",
          language: "en",
          dialect: "NONE",
        },
      },
    },
    include: { audience: true, voice: true, visualIdentity: true, contentRules: true },
  });

  console.log("Creating strategy and content pillars…");
  const strategy = await prisma.strategy.create({
    data: {
      brandId: brand.id,
      version: 1,
      isActive: true,
      summary:
        "Build a loyal, engaged local following by pairing behind-the-scenes craft storytelling with practical brewing education, using product content sparingly and always in service of a story.",
      goals: ["Grow Instagram engagement rate above 4%", "Drive foot traffic to both café locations", "Build an email list via IG bio link"],
      weeklyThemes: ["Monday: Brew tip", "Wednesday: Behind the scenes", "Friday: Community/customer spotlight"],
      recommendedFormats: ["CAROUSEL", "POST", "REEL"],
      recommendations: [
        "Lean into carousels for educational content — they consistently outperform single posts for this audience.",
        "Feature the roasting process and staff more — audience responds to authenticity over polish.",
      ],
      aiModel: "claude",
      promptVersion: "strategy.v1",
    },
  });

  const pillars = await Promise.all(
    [
      { name: "Education", description: "Brewing tips, coffee origin stories, how-tos.", targetRatio: 0.35 },
      { name: "Behind the Scenes", description: "Roasting process, staff, sourcing trips.", targetRatio: 0.25 },
      { name: "Product", description: "New blends, merch, seasonal drops — used sparingly.", targetRatio: 0.2 },
      { name: "Community", description: "Customer spotlights, local partnerships, events.", targetRatio: 0.2 },
    ].map((p) => prisma.contentPillar.create({ data: { brandId: brand.id, strategyId: strategy.id, ...p } }))
  );
  const [pillarEducation, pillarBTS, pillarProduct, pillarCommunity] = pillars;

  const campaign = await prisma.campaign.create({
    data: { brandId: brand.id, name: "Winter Warmers Launch", objective: "Promote the winter seasonal blend", startDate: daysFromNow(-5), endDate: daysFromNow(20) },
  });

  console.log("Creating content across the full lifecycle…");

  await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarEducation.id,
      title: "Latte art tutorial teaser",
      objective: "Tease an upcoming latte art tutorial reel",
      format: "REEL",
      platform: "INSTAGRAM",
      status: "IDEA",
      hashtags: [],
      body: {},
    },
  });

  const draft = await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarBTS.id,
      title: "Meet Sam, our head roaster",
      objective: "Introduce the head roaster to build a personal connection with the brand",
      format: "POST",
      platform: "INSTAGRAM",
      status: "DRAFT",
      hook: "Sam has roasted over 40,000 lbs of coffee in the last two years — and he still tastes every single batch.",
      caption:
        "Meet Sam — our head roaster and the reason your morning cup tastes the way it does. Every batch gets tasted, logged, and tweaked until it's right. That's the small-batch difference.",
      cta: "Come say hi at the roastery counter this Saturday.",
      hashtags: ["#smallbatch", "#coffeeroaster", "#AcmeCoffeeCo"],
      body: { visualDirection: "Candid portrait of Sam at the roaster, warm light, mid-action", assumptions: ["Assumed Sam is available Saturday — confirm with him"] },
      promptVersion: "post.v1",
      aiModel: "claude",
    },
  });
  await prisma.contentVersion.create({ data: { contentId: draft.id, versionNumber: 1, snapshot: { title: draft.title, caption: draft.caption }, changeSummary: "Initial AI generation", createdBy: "ai" } });

  const needsEdit = await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarProduct.id,
      title: "Weekend flash sale",
      objective: "Drive weekend sales",
      format: "POST",
      platform: "INSTAGRAM",
      status: "NEEDS_EDIT",
      hook: "50% OFF EVERYTHING THIS WEEKEND ONLY!!!",
      caption: "Don't miss it — 50% off everything, this weekend only! Stock up now before it's gone!!",
      cta: "Shop now before it sells out!",
      hashtags: ["#sale", "#discount", "#coffee"],
      rejectionReason: "Too promotional / salesy — doesn't match our brand voice at all. We rarely discount and this reads like a generic ecommerce blast.",
      body: { visualDirection: "Bold sale graphic", assumptions: [] },
      promptVersion: "post.v1",
      aiModel: "claude",
    },
  });
  await prisma.qualityReview.create({
    data: {
      contentId: needsEdit.id,
      overallScore: 58,
      scores: { hook: 40, clarity: 70, value: 45, brandFit: 20, audienceFit: 50, originality: 55, cta: 60, visualDirection: 65, accuracy: 90, platformFit: 60 },
      strengths: ["Clear CTA"],
      weaknesses: ["Doesn't match brand voice", "Feels generic and pushy"],
      issues: ["Tone is far more promotional than the brand's stated voice guidelines allow"],
      recommendations: ["Rewrite with a softer, more inviting tone", "Tie the discount to a story instead of leading with the price"],
      outcome: "NEEDS_WORK",
      promptVersion: "review.v1",
      aiModel: "claude",
    },
  });
  await prisma.approvalEvent.create({ data: { contentId: needsEdit.id, userId: user.id, action: "REJECT", reason: needsEdit.rejectionReason! } });
  await prisma.brandMemoryEntry.create({
    data: {
      brandId: brand.id,
      contentId: needsEdit.id,
      source: "REJECTION_FEEDBACK",
      key: "tone.promotional_language",
      insight: "Reduce promotional / salesy language — audience reacts better to a softer tone.",
      confidence: 0.5,
    },
  });

  const pendingApproval = await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarEducation.id,
      title: "5 ways to brew better coffee at home",
      objective: "Educational carousel driving saves and shares",
      format: "CAROUSEL",
      platform: "INSTAGRAM",
      status: "PENDING_APPROVAL",
      hook: "You don't need a $2,000 setup to brew great coffee at home.",
      caption: "5 small changes that make the biggest difference in your home brew. Save this for your next grocery run. ☕",
      cta: "Save this post for your next brew day.",
      hashtags: ["#coffeetips", "#homebrew", "#specialtycoffee", "#AcmeCoffeeCo"],
      body: {
        slides: [
          { number: 1, headline: "You don't need $2,000 to brew great coffee", body: "5 small changes, big difference.", purpose: "hook", visualDirection: "Bold text over a moody coffee setup" },
          { number: 2, headline: "1. Grind fresh, every time", body: "Pre-ground coffee loses flavor within days. A $30 hand grinder changes everything.", purpose: "point", visualDirection: "Close-up of fresh grounds" },
          { number: 3, headline: "2. Weigh your water and coffee", body: "A kitchen scale beats eyeballing it. Aim for a 1:16 ratio to start.", purpose: "point", visualDirection: "Scale with coffee and kettle" },
          { number: 4, headline: "3. Water temp matters", body: "195-205°F. Off the boil by 30 seconds is the easy trick.", purpose: "point", visualDirection: "Kettle pouring, steam visible" },
          { number: 5, headline: "Try it this week", body: "Small changes, noticeably better coffee.", purpose: "cta", visualDirection: "Finished cup, warm light", cta: "Save this post for your next brew day." },
        ],
        assumptions: [],
      },
      promptVersion: "carousel.v1",
      aiModel: "claude",
    },
  });
  await prisma.qualityReview.create({
    data: {
      contentId: pendingApproval.id,
      overallScore: 91,
      scores: { hook: 90, clarity: 95, value: 95, brandFit: 90, audienceFit: 92, originality: 80, cta: 88, visualDirection: 90, accuracy: 95, platformFit: 92 },
      strengths: ["Strong, specific hook", "Genuinely useful, saveable content", "Clear narrative progression across slides"],
      weaknesses: ["Could name a specific grinder recommendation"],
      issues: [],
      recommendations: ["Consider linking a specific budget grinder in the caption"],
      outcome: "APPROVED",
      promptVersion: "review.v1",
      aiModel: "claude",
    },
  });

  const approved = await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarProduct.id,
      campaignId: campaign.id,
      title: "Our new cold brew kit is here",
      objective: "Launch the new cold brew kit product",
      format: "POST",
      platform: "INSTAGRAM",
      status: "APPROVED",
      hook: "Cold brew, without the 18-hour wait.",
      caption: "Our new cold brew kit makes café-quality cold brew at home in under 5 minutes of hands-on time. Everything you need, one box.",
      cta: "Link in bio to shop.",
      hashtags: ["#coldbrew", "#AcmeCoffeeCo", "#specialtycoffee"],
      body: { visualDirection: "Product flat-lay, natural light, coffee-toned background", assumptions: [] },
      promptVersion: "post.v1",
      aiModel: "claude",
    },
  });
  await prisma.approvalEvent.create({ data: { contentId: approved.id, userId: user.id, action: "APPROVE" } });

  const scheduledFor = daysFromNow(2);
  const scheduled = await prisma.content.create({
    data: {
      brandId: brand.id,
      contentPillarId: pillarCommunity.id,
      title: "Weekend café hours reminder",
      objective: "Remind followers of updated weekend hours",
      format: "POST",
      platform: "INSTAGRAM",
      status: "SCHEDULED",
      hook: "New weekend hours, same great coffee.",
      caption: "We're now open until 6pm on weekends! Come hang out, work, or just enjoy a slow cup.",
      cta: "See you this weekend.",
      hashtags: ["#AcmeCoffeeCo", "#coffeeshop"],
      body: { visualDirection: "Café interior, cozy morning light", assumptions: [] },
    },
  });
  await prisma.calendarItem.create({
    data: { brandId: brand.id, contentId: scheduled.id, campaignId: campaign.id, title: scheduled.title, scheduledFor, platform: "INSTAGRAM", format: "POST" },
  });
  await prisma.publishingJob.create({
    data: { brandId: brand.id, contentId: scheduled.id, status: "QUEUED", provider: "mock", scheduledFor, idempotencyKey: `seed:${scheduled.id}:queued` },
  });

  console.log("Creating published content with performance history…");

  async function createPublished(params: {
    title: string;
    pillarId: string;
    format: "POST" | "CAROUSEL";
    hook: string;
    caption: string;
    cta: string;
    hashtags: string[];
    body: object;
    daysAgo: number;
    performance: "high" | "medium" | "low";
    imageLabel: string;
  }) {
    const publishedAt = daysFromNow(-params.daysAgo);
    const content = await prisma.content.create({
      data: {
        brandId: brand.id,
        contentPillarId: params.pillarId,
        title: params.title,
        format: params.format,
        platform: "INSTAGRAM",
        status: "PUBLISHED",
        hook: params.hook,
        caption: params.caption,
        cta: params.cta,
        hashtags: params.hashtags,
        body: params.body,
        promptVersion: params.format === "CAROUSEL" ? "carousel.v1" : "post.v1",
        aiModel: "claude",
        updatedAt: publishedAt,
      },
    });

    await prisma.qualityReview.create({
      data: {
        contentId: content.id,
        overallScore: 88,
        scores: { hook: 88, clarity: 90, value: 88, brandFit: 90, audienceFit: 88, originality: 82, cta: 85, visualDirection: 88, accuracy: 95, platformFit: 90 },
        strengths: ["On-brand", "Clear value"],
        weaknesses: [],
        issues: [],
        recommendations: [],
        outcome: "APPROVED",
        promptVersion: "review.v1",
        aiModel: "claude",
      },
    });

    const imageUrl = await writePlaceholderImage(
      `seed/${content.id}.svg`,
      params.imageLabel,
      "#6F4E37",
      "#2B1B12"
    );
    await prisma.contentAsset.create({ data: { contentId: content.id, type: "IMAGE", provider: "MOCK", url: imageUrl } });

    const externalPostId = `mock_${content.id}_${publishedAt.getTime()}_seeded01`;
    await prisma.publishingJob.create({
      data: {
        brandId: brand.id,
        contentId: content.id,
        status: "PUBLISHED",
        provider: "mock",
        scheduledFor: publishedAt,
        externalPostId,
        attempts: 1,
        idempotencyKey: `seed:${content.id}:published`,
        updatedAt: publishedAt,
      },
    });

    const profiles = {
      high: { reach: 5200, impressions: 6100, likes: 410, comments: 38, shares: 22, saves: 190, profileVisits: 140, followerDelta: 18 },
      medium: { reach: 2100, impressions: 2500, likes: 95, comments: 9, shares: 4, saves: 30, profileVisits: 40, followerDelta: 4 },
      low: { reach: 650, impressions: 800, likes: 12, comments: 1, shares: 0, saves: 3, profileVisits: 6, followerDelta: 0 },
    } as const;
    const m = profiles[params.performance];
    const engagementRate = Number((((m.likes + m.comments + m.shares + m.saves) / m.reach) * 100).toFixed(2));
    await prisma.analyticsMetric.create({
      data: {
        brandId: brand.id,
        contentId: content.id,
        capturedAt: daysFromNow(-params.daysAgo + 1),
        ...m,
        engagementRate,
        source: "mock",
        isSeedData: true,
      },
    });

    return content;
  }

  await createPublished({
    title: "Behind the scenes: roasting day",
    pillarId: pillarBTS.id,
    format: "CAROUSEL",
    hook: "This is what Tuesday looks like at 6am.",
    caption: "Every batch is roasted, cupped, and logged before it ever reaches your cup. Here's what roasting day actually looks like.",
    cta: "Which bean should we roast next? Tell us below.",
    hashtags: ["#roastday", "#smallbatch", "#AcmeCoffeeCo"],
    body: {
      slides: [
        { number: 1, headline: "6am, roasting day", body: "Every Tuesday, the roastery comes alive.", purpose: "hook", visualDirection: "Roaster warming up, dawn light" },
        { number: 2, headline: "Green beans in", body: "Sourced direct from three small farms this season.", purpose: "point", visualDirection: "Green coffee beans close-up" },
        { number: 3, headline: "12 minutes to first crack", body: "We listen and watch color the whole way — no autopilot.", purpose: "point", visualDirection: "Roaster drum, beans visible" },
        { number: 4, headline: "Cupping every batch", body: "If it's not right, it doesn't ship.", purpose: "point", visualDirection: "Cupping table, spoons and bowls" },
        { number: 5, headline: "Which bean next?", body: "Tell us in the comments.", purpose: "cta", visualDirection: "Bags of roasted beans, labeled", cta: "Which bean should we roast next?" },
      ],
      assumptions: [],
    },
    daysAgo: 6,
    performance: "high",
    imageLabel: "Roasting Day",
  });

  await createPublished({
    title: "Our founder's coffee journey",
    pillarId: pillarCommunity.id,
    format: "POST",
    hook: "Ten years ago, this started as a hobby in a garage.",
    caption: "From a garage roaster to two cafés — here's how Acme Coffee Co started, in our founder's own words.",
    cta: "What's your coffee origin story? Tell us below.",
    hashtags: ["#foundedstory", "#AcmeCoffeeCo"],
    body: { visualDirection: "Founder portrait in the original garage setup, nostalgic tone", assumptions: [] },
    daysAgo: 10,
    performance: "medium",
    imageLabel: "Founder Story",
  });

  await createPublished({
    title: "New seasonal blend announcement",
    pillarId: pillarProduct.id,
    format: "POST",
    hook: "Introducing: Winter Warmer.",
    caption: "Our winter seasonal blend is here — notes of brown sugar, cinnamon, and toasted pecan.",
    cta: "Available in-store and online now.",
    hashtags: ["#seasonalblend", "#AcmeCoffeeCo"],
    body: { visualDirection: "Bag of coffee on a winter-themed flat lay", assumptions: [] },
    daysAgo: 3,
    performance: "low",
    imageLabel: "Winter Blend",
  });

  await prisma.content.create({
    data: {
      brandId: brand.id,
      title: "Old promo — Q1 2025",
      format: "POST",
      platform: "INSTAGRAM",
      status: "ARCHIVED",
      caption: "Outdated seasonal promo, kept for reference.",
      hashtags: [],
      body: {},
    },
  });

  console.log("Creating brand memory, insight, and Instagram mock integration…");

  await prisma.brandMemoryEntry.create({
    data: { brandId: brand.id, source: "MANUAL", key: "voice.no_emoji_overload", insight: "Use at most 1-2 emoji per caption — the brand voice reads better restrained.", confidence: 0.6 },
  });

  await prisma.aIInsight.create({
    data: {
      brandId: brand.id,
      summary: "Behind-the-scenes carousels significantly outperform single product posts on both reach and engagement — but the sample is still small.",
      winningPatterns: ["Carousels showing process/craft (roasting day) drive the highest saves and shares", "Posts with a specific, concrete hook outperform generic announcements"],
      losingPatterns: ["Plain product announcement posts underperform on reach and engagement"],
      recommendations: ["Prioritize behind-the-scenes carousel content", "Pair any product announcement with a story or process angle instead of posting it alone"],
      experiments: ["Try a founder-narrated Reel of a roasting day", "Test a customer-spotlight carousel format"],
      confidence: 0.55,
      status: "NEW",
      promptVersion: "analytics.v1",
      aiModel: "claude",
    },
  });

  await prisma.integration.create({
    data: {
      brandId: brand.id,
      type: "INSTAGRAM",
      status: "MOCK",
      accountId: "mock_account",
      accountName: "Mock Instagram Account (@acmecoffeeco)",
      lastCheckedAt: new Date(),
    },
  });

  const statusCounts = await prisma.content.groupBy({ by: ["status"], where: { brandId: brand.id }, _count: true });
  console.log("\nSeed complete.");
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("  Content by status:");
  for (const row of statusCounts as Array<{ status: ContentStatus; _count: number }>) {
    console.log(`    ${row.status}: ${row._count}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
