# User feedback summary (Level 4)

Collect ratings via the in-app **Feedback** button (header). With `VITE_FEEDBACK_ENDPOINT` set (Formspree recommended), responses also land in your Formspree inbox. Local copies are stored in the browser under `orbit-feedback-entries`.

## Setup (optional remote inbox)

1. Create a free form at [Formspree](https://formspree.io/).
2. Add to Vercel (and `.env.local`):

```bash
VITE_FEEDBACK_ENDPOINT=https://formspree.io/f/xxxxxxxx
```

3. Redeploy so production collects remote feedback.

## Summary (fill before submission)

**Period:** YYYY-MM-DD → YYYY-MM-DD  
**Responses:** N  
**Average rating:** X.X / 5

### What users liked

- …
- …

### What users asked to improve

- …
- …

### Actions taken

- …
- …

### Sample quotes

> “…”

> “…”
