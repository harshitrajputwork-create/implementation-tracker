#!/usr/bin/env python3
"""Parse INDUSTRY_USE_CASES.md into a SQL seed migration for use_cases.

Reads the curated per-industry use-case tables (title, description, 3 example
accounts) and writes a SQL migration that inserts them, mapping the MD's
industry labels onto this app's client Industry dropdown values.
"""
import re
import sys

SRC = r"C:\Users\Harshit Rajput\Desktop\Taqtics\USE CASES\INDUSTRY_USE_CASES.md"
OUT = r"C:\Users\Harshit Rajput\Desktop\implementation-tracker\supabase\migrations\013_industry_use_cases.sql"

# MD industry heading -> app industry_tag. Values not already in the app's
# client "Industry" dropdown get added there too (see clients/new/page.tsx).
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
    # [name](url), [name](url), ...
    return re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", cell)

def main():
    with open(SRC, encoding="utf-8") as f:
        text = f.read()

    lines = text.splitlines()
    industry = None
    rows = []
    unmapped = set()

    for line in lines:
        h2 = re.match(r"^## (.+)$", line)
        if h2:
            industry = h2.group(1).strip()
            continue

        m = re.match(r"^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\S+)\s*\|$", line)
        if not m or industry is None:
            continue
        _, title, desc, accounts_cell, _count = m.groups()
        if title.lower() in ("use case",):
            continue

        tag = INDUSTRY_MAP.get(industry)
        if tag is None:
            unmapped.add(industry)
            continue

        accounts = parse_account_links(accounts_cell)
        rows.append((tag, title.strip(), desc.strip(), accounts))

    if unmapped:
        print("WARNING: unmapped industries:", unmapped, file=sys.stderr)

    print(f"Parsed {len(rows)} use cases across {len(set(r[0] for r in rows))} industries")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("-- Curated use cases per industry, imported from the account-coverage catalog.\n")
        f.write("-- example_accounts: real accounts already running this use case, for an\n")
        f.write("-- implementer to reference — never shown in the client-facing PDF export.\n\n")
        f.write("ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS example_accounts JSONB DEFAULT '[]'::jsonb;\n\n")
        for tag, title, desc, accounts in rows:
            acc_json = "[" + ",".join(
                '{"name":"%s","url":"%s"}' % (sql_escape(n), sql_escape(u)) for n, u in accounts
            ) + "]"
            f.write(
                "INSERT INTO use_cases (title, description, industry_tag, example_accounts) VALUES "
                "('%s', '%s', '%s', '%s'::jsonb);\n" % (
                    sql_escape(title), sql_escape(desc), sql_escape(tag), sql_escape(acc_json)
                )
            )

    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
