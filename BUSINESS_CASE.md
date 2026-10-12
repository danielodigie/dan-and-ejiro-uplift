# Dan and Ejiro Uplift — One-Page Business Case

> Companion to the viability review. All numbers are explicit assumptions to be replaced with beta data.

## 1. Assumptions
- Stack stays local-first for MVP (infra ≈ $0/mo): Postgres + API on-device, R2 pennies/GB, Expo Go distribution.
- Fixed costs/yr: Apple Developer $99 + Google Play $25 (once) + domain $15 + R2/buffer $50 ≈ **$165/yr (~$14/mo)**.
- Real cost is founder time; infra breakeven is trivially low (see §4). Sustainability = covering living costs, not servers.
- Funnel (assumed, validate in beta): 60% downloads→onboarding complete; D30 retention 20%; free→paid trial 5%; trial→paid 40% ⇒ **~1.2% of downloads become payers within 60 days**.
- Store fees: 15% (small-business programs) ⇒ net factor 0.85.

## 2. Pricing (launch)
| Product | Price | Net/unit | Rationale |
|---|---|---|---|
| Premium monthly | $5 | $4.25 | Under Calm/Headspace; impulse-level |
| Premium yearly | $39 | $33.15 | ~35% discount, cash upfront |
| Uplift Pack (one-off) | $3 | $2.55 | Confidence/Career/Exam packs |
| Gifted Uplift | $7 | $5.95 | Buyer≠beneficiary premium; occasions |
| Partnerships (church/school/org) | $49–199/yr per org | ~90% | Bulk encouragement seats; highest ARPU, post-MVP |

Blended target: **$4.50 net per payer per month** (mix of monthly + yearly + packs).

## 3. Breakeven math
- Infra-only breakeven: $14/mo ÷ $4.50 ≈ **4 paying users**. (Infra is not the business risk — retention is.)
- Sustainability targets:
| Goal | MRR | Payers needed (@$4.50) | MAU needed (@5% conv) | Downloads (@1.2% payer rate) |
|---|---|---|---|---|
| Ramen ($500/mo) | $500 | ~111 | ~2,200 | ~9,300 |
| Indie salary ($2k/mo) | $2,000 | ~445 | ~8,900 | ~37,000 |
| Small team ($8k/mo) | $8,000 | ~1,780 | ~35,600 | ~148,000 |

## 4. Scenarios (12 months from launch)
|  | Conservative | Base | Optimistic |
|---|---|---|---|
| Cumulative downloads | 5,000 | 20,000 | 60,000 |
| Payers (1.2%) | 60 | 240 | 720 |
| MRR (@$4.50) | $270 | $1,080 | $3,240 |
| + Packs/gifts (est. +20%) | $324 | $1,296 | $3,888 |
| Covers | infra 23× | ramen-ish | indie salary+ |

Base case needs ~1,700 downloads/mo with retention holding — achievable via 3–5 church/campus partners + share flywheel, not paid ads.

## 5. Make-or-break metrics (kill/continue gates)
- D30 retention ≥ 20% (else: positioning/content problem — fix before monetizing harder)
- Trial start ≥ 5% of MAU; trial→paid ≥ 40%
- Share rate ≥ 8% of uplift views (distribution engine)
- "Meaningful" rate (like/save/share/action per view) ≥ 15%

## 6. Biggest risks → mitigations
1. January-spike churn → streak/celebrate design + timely nudges; measure D30 ruthlessly.
2. Free AI encouragement → moat is memory+timeliness (my goal, my week, my faith), not prose quality.
3. Free tier too generous → premium sells depth (journeys, audio, insights), never locks hope itself.
4. Scope creep (20 features) → MVP 17 items only; packs/partnerships after retention proven.

## Verdict
Viable indie/small-team business on near-zero burn; venture-scale only if B2B partnerships fire. Next money milestone: **$1k MRR (~230 payers)** — proves habit + willingness to pay.
