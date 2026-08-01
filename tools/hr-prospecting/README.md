# HR Prospecting Helper

This is a small local tool for finding publicly listed recruiting contact emails from job posts and career pages.

It is designed for:

- Roles: React Native Developer, Mobile App Developer, React Developer
- Regions: India, UAE, Europe, Germany, Ireland, Singapore, UK, US, Remote
- Focus: visa sponsorship, relocation, work permit sponsorship
- Contacts: emails visibly published on public job/career pages

It does not log in to LinkedIn, bypass paywalls, or scrape private profiles. For LinkedIn results, use the job URL/recruiter name manually when the email is not publicly shown.

## Run

From the repo root:

```bash
python3 tools/hr-prospecting/public_job_email_finder.py
```

The output CSV is written to:

```text
tools/hr-prospecting/output/hr_contacts.csv
```

The script searches both:

- visa/relocation/sponsorship job posts
- public job posts that mention HR/recruiter/contact emails

The `visa_signal` column tells you when sponsorship language was found on the page.

## Useful Options

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --max-results-per-query 8 --max-pages 80
```

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --regions "Germany,Ireland,UK,Remote" --roles "React Native Developer,Mobile App Developer"
```

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --include-general-emails
```

To search only pages that mention sponsorship or relocation:

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --sponsorship-required
```

If search engines block automated results, use the generated `search_queries.csv` links manually, paste good job URLs into `seed_urls.txt`, then run:

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --seed-urls-file tools/hr-prospecting/seed_urls.txt
```

To process only your pasted URLs and skip automated search:

```bash
python3 tools/hr-prospecting/public_job_email_finder.py --seed-urls-file tools/hr-prospecting/seed_urls.txt --skip-search
```

## CSV Columns

- `company_hint`
- `role`
- `region`
- `visa_signal`
- `email`
- `email_type`
- `source_url`
- `page_title`
- `context_snippet`
- `confidence`
- `query`

## Notes

- Results depend on what is publicly visible online.
- Some sites block automated reads. The script records only pages it can access normally.
- Prefer direct job post emails, company career emails, and recruiter emails explicitly listed in the post.
- Before sending outreach, verify the job is still active and personalize the message.
