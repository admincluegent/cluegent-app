#!/usr/bin/env python3
"""
Find public recruiting emails from job posts and career pages.

This script uses DuckDuckGo's public HTML results and fetches normal public pages.
It intentionally avoids login-only/private scraping and skips common social/profile
platforms that typically forbid automated extraction.
"""

from __future__ import annotations

import argparse
import base64
import csv
import html
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_ROLES = [
    "React Native Developer",
    "Mobile App Developer",
    "React Developer",
]

DEFAULT_REGIONS = [
    "India",
    "UAE",
    "Europe",
    "Germany",
    "Ireland",
    "Singapore",
    "UK",
    "US",
    "Remote",
]

PORTAL_TERMS = [
    "send your CV",
    "apply by email",
    "recruiter email",
    "HR email",
    "careers@",
    "talent@",
    "jobs@",
]

SPONSORSHIP_TERMS = [
    "visa sponsorship",
    "visa sponsored",
    "work permit sponsorship",
    "relocation support",
    "relocation assistance",
    "sponsorship available",
    "skilled worker visa",
    "tier 2 visa",
    "H-1B",
    "H1B",
]

SITE_FILTERS = [
    "site:greenhouse.io",
    "site:lever.co",
    "site:workable.com",
    "site:ashbyhq.com",
    "site:smartrecruiters.com",
    "site:bamboohr.com",
    "site:wellfound.com",
    "site:instahyre.com",
    "site:hirist.tech",
    "site:naukri.com",
    "site:indeed.com",
    "site:gulftalent.com",
    "site:bayt.com",
]

SKIP_DOMAINS = {
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "youtube.com",
    "tiktok.com",
}

EMAIL_RE = re.compile(
    r"(?<![\w.+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?![\w.+-])",
    re.IGNORECASE,
)

BAD_EMAIL_PARTS = (
    "example@",
    "your@email",
    "email@example",
    "test@",
    "noreply@",
    "no-reply@",
    "privacy@",
    "support@",
    "abuse@",
    "security@",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
)

HR_MAILBOX_WORDS = (
    "hr",
    "career",
    "careers",
    "job",
    "jobs",
    "recruit",
    "recruiter",
    "recruiting",
    "recruitment",
    "talent",
    "people",
    "hiring",
)


@dataclass(frozen=True)
class Result:
    company_hint: str
    role: str
    region: str
    visa_signal: str
    email: str
    email_type: str
    source_url: str
    page_title: str
    context_snippet: str
    confidence: str
    query: str


def clean_text(value: str) -> str:
    value = html.unescape(value)
    value = re.sub(r"<script[\s\S]*?</script>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<style[\s\S]*?</style>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def page_title(markup: str) -> str:
    match = re.search(r"<title[^>]*>([\s\S]*?)</title>", markup, flags=re.IGNORECASE)
    return clean_text(match.group(1))[:160] if match else ""


def domain_from_url(url: str) -> str:
    host = urllib.parse.urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def should_skip_url(url: str) -> bool:
    domain = domain_from_url(url)
    return any(domain == skipped or domain.endswith("." + skipped) for skipped in SKIP_DOMAINS)


def request_url(url: str, timeout: int = 15) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "text/plain" not in content_type:
            return ""
        raw = response.read(1_500_000)
        charset = response.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="ignore")


def duckduckgo_search(query: str, max_results: int) -> list[str]:
    params = urllib.parse.urlencode({"q": query})
    search_url = f"https://html.duckduckgo.com/html/?{params}"
    markup = request_url(search_url)
    urls: list[str] = []

    for match in re.finditer(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"', markup):
        href = html.unescape(match.group(1))
        parsed = urllib.parse.urlparse(href)
        if "duckduckgo.com" in parsed.netloc and parsed.query:
            query_params = urllib.parse.parse_qs(parsed.query)
            href = query_params.get("uddg", [href])[0]
        if href.startswith("http") and not should_skip_url(href) and href not in urls:
            urls.append(href)
        if len(urls) >= max_results:
            break

    return urls


def decode_bing_url(url: str) -> str:
    parsed = urllib.parse.urlparse(html.unescape(url))
    if "bing.com" not in parsed.netloc:
        return html.unescape(url)

    query_params = urllib.parse.parse_qs(parsed.query)
    encoded = query_params.get("u", [""])[0]
    if not encoded.startswith("a1"):
        return html.unescape(url)

    payload = encoded[2:]
    padding = "=" * (-len(payload) % 4)
    try:
        return base64.urlsafe_b64decode(payload + padding).decode("utf-8", errors="ignore")
    except ValueError:
        return html.unescape(url)


def bing_search(query: str, max_results: int) -> list[str]:
    params = urllib.parse.urlencode({"q": query})
    search_url = f"https://www.bing.com/search?{params}"
    markup = request_url(search_url)
    urls: list[str] = []

    for match in re.finditer(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"', markup, flags=re.IGNORECASE):
        href = decode_bing_url(match.group(1))
        if href.startswith("http") and not should_skip_url(href) and href not in urls:
            urls.append(href)
        if len(urls) >= max_results:
            break

    return urls


def search_web(query: str, max_results: int) -> list[str]:
    errors: list[str] = []
    for provider in (duckduckgo_search, bing_search):
        try:
            urls = provider(query, max_results)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            errors.append(f"{provider.__name__}: {exc}")
            continue
        if urls:
            return urls
    if errors:
        print("  search providers failed: " + " | ".join(errors))
    return []


def build_queries(
    roles: list[str],
    regions: list[str],
    sponsorship_required: bool,
) -> Iterable[tuple[str, str, str]]:
    for role in roles:
        for region in regions:
            sponsorship = '("visa sponsorship" OR "relocation" OR "work permit" OR "sponsorship")'
            contact = '("send your CV" OR "apply by email" OR "HR" OR "recruiter" OR "careers@" OR "talent@" OR "jobs@")'
            general_contact = '("send resume" OR "send CV" OR "email your resume" OR "careers@" OR "talent@" OR "jobs@" OR "hr@")'
            yield role, region, f'"{role}" "{region}" {sponsorship} {contact}'
            if not sponsorship_required:
                yield role, region, f'"{role}" "{region}" {general_contact}'

            for site_filter in SITE_FILTERS:
                yield role, region, f'"{role}" "{region}" {sponsorship} {site_filter}'
                if not sponsorship_required:
                    yield role, region, f'"{role}" "{region}" {general_contact} {site_filter}'


def extract_emails(text: str) -> set[str]:
    emails = set()
    for match in EMAIL_RE.findall(text):
        email_address = match.strip(".,;:()[]{}<>").lower()
        if any(part in email_address for part in BAD_EMAIL_PARTS):
            continue
        emails.add(email_address)
    return emails


def email_type(email_address: str) -> str:
    local = email_address.split("@", 1)[0].lower()
    if any(word in local for word in HR_MAILBOX_WORDS):
        return "hr_or_careers_mailbox"
    if "." in local or "_" in local or "-" in local:
        return "named_contact"
    return "general_or_unknown"


def context_snippet(visible_text: str, email_address: str, radius: int = 180) -> str:
    index = visible_text.lower().find(email_address.lower())
    if index < 0:
        return ""
    start = max(0, index - radius)
    end = min(len(visible_text), index + len(email_address) + radius)
    snippet = visible_text[start:end].strip()
    return re.sub(r"\s+", " ", snippet)


def confidence_for(email_address: str, visible_text: str, include_general: bool) -> tuple[str, bool]:
    kind = email_type(email_address)
    lower_text = visible_text.lower()
    has_job_context = any(term.lower() in lower_text for term in PORTAL_TERMS)
    has_role_context = any(role.lower() in lower_text for role in DEFAULT_ROLES)

    if kind == "hr_or_careers_mailbox":
        return ("high" if has_job_context or has_role_context else "medium", True)
    if kind == "named_contact":
        return ("medium" if has_job_context or has_role_context else "low", True)
    return ("low", include_general)


def visa_signal(visible_text: str) -> str:
    lower_text = visible_text.lower()
    matches = [term for term in SPONSORSHIP_TERMS if term.lower() in lower_text]
    return "; ".join(matches[:4])


def company_hint_from_url(url: str) -> str:
    domain = domain_from_url(url)
    parts = domain.split(".")
    if len(parts) >= 2 and parts[-2] in {"greenhouse", "lever", "workable", "ashbyhq", "smartrecruiters"}:
        return domain
    return parts[-2] if len(parts) >= 2 else domain


def parse_csv_arg(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def read_seed_urls(path: str | None) -> list[str]:
    if not path:
        return []
    seed_path = Path(path)
    if not seed_path.exists():
        raise FileNotFoundError(f"Seed URL file does not exist: {seed_path}")
    urls: list[str] = []
    for line in seed_path.read_text(encoding="utf-8").splitlines():
        value = line.strip()
        if not value or value.startswith("#"):
            continue
        if value.startswith("http") and not should_skip_url(value):
            urls.append(value)
    return urls


def write_results(path: Path, results: list[Result]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(Result.__dataclass_fields__.keys()))
        writer.writeheader()
        for result in results:
            writer.writerow(result.__dict__)


def write_queries(path: Path, queries: list[tuple[str, str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["role", "region", "query", "google_url", "bing_url"])
        writer.writeheader()
        for role, region, query in queries:
            writer.writerow(
                {
                    "role": role,
                    "region": region,
                    "query": query,
                    "google_url": "https://www.google.com/search?q=" + urllib.parse.quote_plus(query),
                    "bing_url": "https://www.bing.com/search?q=" + urllib.parse.quote_plus(query),
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Find public HR/recruiter emails from job posts.")
    parser.add_argument("--roles", default=",".join(DEFAULT_ROLES), help="Comma-separated role names.")
    parser.add_argument("--regions", default=",".join(DEFAULT_REGIONS), help="Comma-separated regions.")
    parser.add_argument("--max-results-per-query", type=int, default=5)
    parser.add_argument("--max-pages", type=int, default=60)
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between page fetches.")
    parser.add_argument(
        "--include-general-emails",
        action="store_true",
        help="Include low-confidence general emails that do not look HR-specific.",
    )
    parser.add_argument(
        "--sponsorship-required",
        action="store_true",
        help="Only search queries containing visa/relocation/sponsorship terms.",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).with_name("output") / "hr_contacts.csv"),
        help="CSV output path.",
    )
    parser.add_argument(
        "--queries-output",
        default=str(Path(__file__).with_name("output") / "search_queries.csv"),
        help="CSV path for generated manual search links.",
    )
    parser.add_argument(
        "--seed-urls-file",
        help="Optional text file containing one public job/career URL per line.",
    )
    parser.add_argument(
        "--skip-search",
        action="store_true",
        help="Only process seed URLs and do not run web searches.",
    )
    args = parser.parse_args()

    roles = parse_csv_arg(args.roles)
    regions = parse_csv_arg(args.regions)
    seen_pages: set[str] = set()
    seen_pairs: set[tuple[str, str]] = set()
    results: list[Result] = []
    pages_checked = 0
    seed_urls = read_seed_urls(args.seed_urls_file)

    queries = list(build_queries(roles, regions, args.sponsorship_required))
    write_queries(Path(args.queries_output), queries)

    for seed_url in seed_urls:
        if pages_checked >= args.max_pages:
            break
        if seed_url in seen_pages:
            continue
        seen_pages.add(seed_url)
        pages_checked += 1
        print(f"Checking seed URL: {seed_url}")
        try:
            markup = request_url(seed_url)
        except (urllib.error.URLError, TimeoutError, OSError, UnicodeError) as exc:
            print(f"  fetch failed: {exc}")
            continue

        visible_text = clean_text(markup)
        title = page_title(markup)
        signal = visa_signal(visible_text)
        role_hint = next((role for role in roles if role.lower() in visible_text.lower()), roles[0] if roles else "")
        region_hint = next((region for region in regions if region.lower() in visible_text.lower()), "")

        for email_address in sorted(extract_emails(visible_text)):
            pair = (email_address, seed_url)
            if pair in seen_pairs:
                continue
            confidence, keep = confidence_for(email_address, visible_text, args.include_general_emails)
            if not keep:
                continue
            seen_pairs.add(pair)
            results.append(
                Result(
                    company_hint=company_hint_from_url(seed_url),
                    role=role_hint,
                    region=region_hint,
                    visa_signal=signal,
                    email=email_address,
                    email_type=email_type(email_address),
                    source_url=seed_url,
                    page_title=title,
                    context_snippet=context_snippet(visible_text, email_address),
                    confidence=confidence,
                    query="seed_url",
                )
            )
        time.sleep(args.delay)

    if args.skip_search:
        output_path = Path(args.output)
        write_results(output_path, results)
        print(f"\nChecked {pages_checked} pages.")
        print(f"Found {len(results)} email rows.")
        print(f"Wrote {output_path.resolve()}")
        return 0

    for role, region, query in queries:
        if pages_checked >= args.max_pages:
            break

        print(f"Searching: {query}")
        urls = search_web(query, args.max_results_per_query)

        for url in urls:
            if pages_checked >= args.max_pages:
                break
            if url in seen_pages:
                continue
            seen_pages.add(url)
            pages_checked += 1
            print(f"  checking: {url}")

            try:
                markup = request_url(url)
            except (urllib.error.URLError, TimeoutError, OSError, UnicodeError) as exc:
                print(f"    fetch failed: {exc}")
                continue

            visible_text = clean_text(markup)
            title = page_title(markup)
            signal = visa_signal(visible_text)

            for email_address in sorted(extract_emails(visible_text)):
                pair = (email_address, url)
                if pair in seen_pairs:
                    continue
                confidence, keep = confidence_for(email_address, visible_text, args.include_general_emails)
                if not keep:
                    continue
                seen_pairs.add(pair)
                results.append(
                    Result(
                        company_hint=company_hint_from_url(url),
                        role=role,
                        region=region,
                        visa_signal=signal,
                        email=email_address,
                        email_type=email_type(email_address),
                        source_url=url,
                        page_title=title,
                        context_snippet=context_snippet(visible_text, email_address),
                        confidence=confidence,
                        query=query,
                    )
                )

            time.sleep(args.delay)

    output_path = Path(args.output)
    write_results(output_path, results)
    print(f"\nChecked {pages_checked} pages.")
    print(f"Found {len(results)} email rows.")
    print(f"Wrote {output_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
