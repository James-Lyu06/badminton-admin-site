# Badminton Admin Site

Internal dashboard for reviewing badminton questionnaire submissions.

## Deploy

1. Upload these files to the repository root.
2. Enable GitHub Pages from `main` / root.
3. Open the deployed site to review online submissions from Supabase.

## AI data assistant

The dashboard sends questions to the `ai-assistant` Supabase Edge Function. The
function calls OpenAI's Responses API, so the OpenAI API key never appears in
the browser or this repository. Contact names and contact details are removed
before questionnaire responses are sent to the function and OpenAI.

### One-time setup

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
log in, and link this repository to the existing Supabase project:

```bash
supabase login
supabase link --project-ref novehfbywvqthsyetjmn
```

Set the server-side secrets. Replace the placeholder with an OpenAI project API
key; never add that key to `config.js` or commit it to GitHub.

```bash
supabase secrets set OPENAI_API_KEY=your_key_here
supabase secrets set ALLOWED_ORIGINS=https://james-lyu06.github.io
```

The default model is `gpt-5.6-terra`. To override it, set `OPENAI_MODEL` as an
additional Supabase secret. Then deploy the function:

```bash
supabase functions deploy ai-assistant
```

The function validates the project's Supabase publishable key, limits request
size and frequency, and only accepts browser requests from configured origins.
The publishable key and the current `ADMIN_PASSWORD` front-end gate are not real
user authentication; use Supabase Auth before treating the entire dashboard or
AI endpoint as production-secure.

## Database

This site reads from the same Supabase project as the client questionnaire.
The dashboard schema matches the client questionnaire and only displays rows for the current questionnaire version.

## Admin Password

Set `ADMIN_PASSWORD` in `config.js` for a lightweight front-end gate. This is not real security; use private hosting or real authentication for production.

