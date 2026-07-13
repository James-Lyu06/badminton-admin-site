# Badminton Admin Site

Internal dashboard for reviewing badminton questionnaire submissions.

## Deploy

1. Upload these files to the repository root.
2. Enable GitHub Pages from `main` / root.
3. Open the deployed site to review online submissions from Supabase.

## Database

This site reads from the same Supabase project as the client questionnaire.
The dashboard schema matches the client questionnaire and only displays rows for the current questionnaire version.

## Admin Password

Set `ADMIN_PASSWORD` in `config.js` for a lightweight front-end gate. This is not real security; use private hosting or real authentication for production.

