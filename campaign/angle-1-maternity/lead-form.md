# Angle 1 — Lead Form: Maternity/Education Gap

**Form Type Recommendation:** Facebook Instant Form (Leads Objective)
- Use "Higher Intent" form type (adds a review step before submit — improves quality)
- NOT "More Volume" type (too many low-quality leads)

**Form Name:** Baby Starter Pack — 2026 SG Parents

---

## Form Structure

### Intro Card (shown before questions)
**Headline:** Your Free Singapore Baby Starter Pack is Ready
**Description:** "Includes: hospital checklist, delivery cost guide, first-month cheat sheet, AND a new 18-year cost timeline so you know what's coming from nappy to university. Download in 10 seconds — completely free."
**Image:** Same image as the ad creative (consistent experience)

---

## Questions

### Auto-fill Fields (Facebook pre-fills these from profile)
1. **Full Name** *(required)*
2. **Phone Number** *(required — WhatsApp number)*
3. **Email Address** *(optional — include if you want email nurture)*

### Custom Questions

**Question 1:**
> When is your baby due (or how old is your baby)?

Answer options:
- Currently pregnant (due 2026)
- Baby is 0–6 months old
- Baby is 6–12 months old
- Baby is 1–2 years old
- Planning to have a baby

*Qualification note: All answers qualify for the lead magnet. This question is for segmentation — target follow-up messaging based on timing urgency.*

---

**Question 2:**
> Are you thinking about starting a savings or investment plan for your child?

Answer options:
- Yes, I've been meaning to start
- I have something in place but want to review
- Not yet — still figuring things out
- Just downloading the guide for now

*Qualification note: "Yes, I've been meaning to start" and "Have something but want to review" = higher priority for meeting. Still send guide to all.*

---

**Question 3:**
> What's your rough monthly household income?

Answer options:
- Below S$5,000
- S$5,000–S$8,000
- S$8,000–S$15,000
- Above S$15,000
- Prefer not to say

*Qualification note: S$8,000+ = flag for meeting outreach. S$5,000–8,000 = still valuable, frame meeting around CPF and lower-cost planning options. Below $5,000 = send to nurture sequence only.*

---

**Question 4:**
> How much are you comfortable setting aside monthly for your child's future?

Answer options:
- Not sure yet
- S$100–S$300/month
- S$300–S$800/month
- S$800–S$1,500/month
- S$1,500+/month

*Qualification note: S$300+/month = eligible for meeting invitation. S$800+/month = priority outreach.*

---

### Thank You Screen
**Headline:** Your Baby Starter Pack is Ready!
**Description:** "Click the button below to download. I'll also reach out on WhatsApp within a few hours with your personalised 18-year cost projection — completely free, no strings attached."
**CTA Button:** Download Your Free Pack
**Link:** [your Google Drive PDF link]

---

## Qualification Decision Tree

```
Lead comes in
      │
      ├── Income S$8k+ AND savings S$300+/month?
      │         → PRIORITY: WhatsApp within 5 min
      │           Offer: "18-year personalised projection call (15 min)"
      │
      ├── Income S$5–8k AND savings S$300+/month?
      │         → STANDARD: WhatsApp within 2 hours
      │           Offer: "Quick chat to see if I can help"
      │
      ├── Income below S$5k OR "just downloading"?
      │         → NURTURE: Add to email sequence
      │           No direct meeting push
      │
      └── "Prefer not to say" on income?
                → Treat as STANDARD until WhatsApp conversation clarifies
```

---

## Lead Routing by Baby Stage

| Baby Stage | Follow-up Tone | Meeting Frame |
|------------|---------------|---------------|
| Currently pregnant | "Before baby arrives" urgency | "Let's set a plan before the chaos starts" |
| 0–6 months | "You've just started the clock" | "Best time to start is NOW — here's why" |
| 6–12 months | "8 months in — have you started the fund?" | Gap awareness, mild urgency |
| 1–2 years | "You're 2 years into the 18-year window" | Compound interest story |
| Planning | Nurture first, offer planning session when "confirmed pregnant" | |

---

## Technical Setup Notes

- Connect lead form to a CRM (e.g., HubSpot Free, Zoho CRM Free) via Zapier
- Zapier trigger: New lead → Send WhatsApp notification to your phone → Auto-send PDF via email (if collecting email)
- Tag leads by income and savings tier for prioritised follow-up
- Response time target: Under 5 minutes for Priority leads, under 2 hours for Standard
