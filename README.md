# AuraSense Feedback Sites

This prototype has been rebuilt as two independent website entries:

- `client/index.html` is the client/tester questionnaire site.
- `admin/index.html` is the internal research dashboard.

The client site no longer shows the sample motion report, score, session summary, or report explanation. It only shows questions and answer controls.

The research dashboard supports:

- Online response review without exporting first
- Search and level filtering
- Summary stats
- Open-text answer review
- A local AI-style summary draft for subjective answers
- Questionnaire editing
- Questions with fixed options plus an "Other" free-text answer

## Free Netlify production URLs

For the current free Netlify deployment, use these two paths:

```text
https://aurasense-feedback.netlify.app/client/
https://aurasense-feedback.netlify.app/admin/
```

Keeping both entries under the same Netlify domain is important while this prototype still shares data through browser localStorage.

## Important limitation

This demo still uses browser `localStorage`. It works for a local prototype because both sites share the same origin. If the client and admin sites are deployed as separate domains, they will need a shared backend such as Supabase, Firebase, or a custom API.
