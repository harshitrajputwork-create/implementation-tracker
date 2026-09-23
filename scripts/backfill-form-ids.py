#!/usr/bin/env python3
"""Backfill example_accounts with the exact checklist title + Process/Audit ID
for each (use case, account) pair, sourced from USE_CASE_ACCOUNT_EVIDENCE.md.

The account URL alone only opens the account homepage — this gives the
implementer the exact checklist name + ID to search for once inside.
"""
import json
import re
import sys

USE_CASES_SRC = r"C:\Users\Harshit Rajput\Desktop\Taqtics\USE CASES\INDUSTRY_USE_CASES.md"
EVIDENCE_SRC = r"C:\Users\Harshit Rajput\Desktop\Taqtics\USE CASES\USE_CASE_ACCOUNT_EVIDENCE.md"
OUT = r"C:\Users\Harshit Rajput\Desktop\implementation-tracker\supabase\migrations\015_use_case_form_ids.sql"

INDUSTRY_MAP = {
    "Food & Beverage": "Food & Beverage (QSR)",
    "Retail & Specialty Stores": "Retail",
    "Jewelry": "Jewelry",
    "Supermarket": "Supermarket",
    "Healthcare & Pharmacy": "Healthcare",
    "Manufacturing & Distribution": "Manufacturing",
    "Hospitality & Fitness": "Hospitality",
    "Fuel & Convenience Retail": "Fuel & Convenience Retail",
    "HR & Workplace Compliance": "HR & Workplace Compliance",
    "Pet Services": "Pet Services",
    "Real Estate, Home & Interiors": "Real Estate",
}

def sql_escape(s: str) -> str:
    return s.replace("'", "''")

def parse_account_links(cell: str):
    return re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", cell)

def parse_use_cases():
    with open(USE_CASES_SRC, encoding="utf-8") as f:
        lines = f.read().splitlines()

    industry = None
    rows = []
    for line in lines:
        h2 = re.match(r"^## (.+)$", line)
        if h2:
            industry = h2.group(1).strip()
            continue
        m = re.match(r"^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\S+)\s*\|$", line)
        if not m or industry is None:
            continue
        _, title, _desc, accounts_cell, _count = m.groups()
        if title.lower() == "use case":
            continue
        tag = INDUSTRY_MAP.get(industry)
        if tag is None:
            continue
        accounts = parse_account_links(accounts_cell)
        rows.append((industry, tag, title.strip(), accounts))
    return rows

def parse_evidence():
    with open(EVIDENCE_SRC, encoding="utf-8") as f:
        text = f.read()

    # evidence[industry_heading][use_case_title][account_name] = (checklist_title, form_id)
    evidence = {}
    industry = None
    section_title = None
    for line in text.splitlines():
        h2 = re.match(r"^## (.+)$", line)
        if h2:
            industry = h2.group(1).strip()
            evidence.setdefault(industry, {})
            continue
        h3 = re.match(r"^### \d+\.\s*(.+)$", line)
        if h3:
            section_title = h3.group(1).strip()
            evidence[industry].setdefault(section_title, {})
            continue
        row = re.match(
            r"^\|\s*\[([^\]]+)\]\([^)]+\)\s*\|\s*(Process|Audit)\s*\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|$",
            line,
        )
        if row and industry and section_title:
            account_name, _type, checklist_title, form_id = row.groups()
            evidence[industry][section_title][account_name] = (checklist_title.strip(), form_id.strip())
    return evidence

def main():
    use_cases = parse_use_cases()
    evidence = parse_evidence()

    updates = []
    matched = 0
    total = 0
    for industry, tag, title, accounts in use_cases:
        acc_map = evidence.get(industry, {}).get(title, {})
        enriched = []
        for name, url in accounts:
            total += 1
            hit = acc_map.get(name)
            entry = {"name": name, "url": url}
            if hit:
                checklist_title, form_id = hit
                matched += 1
                entry["checklistTitle"] = checklist_title
                entry["formId"] = form_id
            enriched.append(entry)
        # json.dumps properly escapes quotes/backslashes inside titles (several
        # contain " or \) — hand-building the JSON string missed those.
        acc_json = json.dumps(enriched, ensure_ascii=False)
        updates.append((tag, title, acc_json))

    print(f"Matched {matched}/{total} account entries to a checklist title + form ID", file=sys.stderr)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(
            "-- Backfill example_accounts with the exact checklist title + Process/Audit\n"
            "-- ID for each account, sourced from USE_CASE_ACCOUNT_EVIDENCE.md. Account\n"
            "-- URLs only open the account homepage — these fields tell the implementer\n"
            "-- exactly what to search for once inside.\n\n"
        )
        for tag, title, acc_json in updates:
            f.write(
                "UPDATE use_cases SET example_accounts = '%s'::jsonb "
                "WHERE title = '%s' AND industry_tag = '%s';\n"
                % (sql_escape(acc_json), sql_escape(title), sql_escape(tag))
            )

    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
