---
name: Uploaded brand assets
description: What to check when asset metadata references a platform-hosted upload after a project handoff.
---

When a supplied asset is represented only by a platform-hosted asset metadata URL, verify that URL in the running app before relying on it. If it is unavailable after handoff, use an existing local brand asset from the supplied project rather than creating replacement artwork.

**Why:** The uploaded Pushyalipi logo metadata route returned the app shell instead of the image in the project preview, while the supplied local brand icon rendered correctly.

**How to apply:** Keep the original artwork unchanged, prefer a local file already in the project, and confirm its HTTP response is an image before finalizing the UI or print report.