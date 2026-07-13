# Badminton Admin Site

Internal dashboard for reviewing badminton questionnaire submissions.

## Deploy

1. Upload these files to the repository root.
2. Enable GitHub Pages from `main` / root.
3. Open the deployed site to review online submissions from Supabase.

## Database

This site reads from the same Supabase project as the client questionnaire.
The dashboard schema matches the client questionnaire and only displays rows for the current questionnaire version.

## Excel export

Use **Export Excel** in the dashboard header to download all loaded submissions
as a UTF-8 CSV file. Each submission is one row and each questionnaire question
is one column. The file opens directly in Excel, including Chinese text.

## Admin Password

Set `ADMIN_PASSWORD` in `config.js` for a lightweight front-end gate. This is not real security; use private hosting or real authentication for production.

