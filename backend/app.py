import urllib.parse

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ATS_SITES = [
    {"id": "ashby", "name": "Ashby", "domain": "jobs.ashbyhq.com"},
    {"id": "greenhouse", "name": "Greenhouse", "domain": "boards.greenhouse.io"},
    {"id": "lever", "name": "Lever", "domain": "jobs.lever.co"},
    {"id": "icims", "name": "iCIMS", "domain": "careers.icims.com"},
    {"id": "jobvite", "name": "Jobvite", "domain": "jobs.jobvite.com"},
    {"id": "workday", "name": "Workday", "domain": "myworkdayjobs.com"},
    {"id": "bamboohr", "name": "BambooHR", "domain": "jobs.bamboohr.com"},
    {"id": "smartrecruiters", "name": "SmartRecruiters", "domain": "jobs.smartrecruiters.com"},
    {"id": "jazzhr", "name": "JazzHR", "domain": "apply.jazz.co"},
    {"id": "workable", "name": "Workable", "domain": "careers.workable.com"},
]

SEARCH_ENGINES = {
    "google": "https://www.google.com/search?q={q}",
    "bing": "https://www.bing.com/search?q={q}",
    "duckduckgo": "https://duckduckgo.com/?q={q}",
}


def quote_if_needed(term: str) -> str:
    term = term.strip()
    if not term:
        return ""
    if " " in term and not (term.startswith('"') and term.endswith('"')):
        return f'"{term}"'
    return term


def build_keyword_expression(terms):
    """
    terms: list of {value, condition}. The first item's condition is ignored
    (it's always the seed of the expression).

    Returns (include_expr, exclude_terms_list)
    """
    include_parts = []
    exclude_parts = []
    has_or = False

    for i, t in enumerate(terms):
        value = quote_if_needed(t.get("value", ""))
        if not value:
            continue

        condition = (t.get("condition") or "AND").upper() if i > 0 else None

        if condition == "NOT":
            exclude_parts.append(value)
            continue

        if not include_parts:
            include_parts.append(value)
        elif condition == "OR":
            has_or = True
            include_parts.append("OR")
            include_parts.append(value)
        else:  # AND (default)
            include_parts.append(value)

    expr = " ".join(include_parts)
    if has_or and len(include_parts) > 1:
        expr = f"({expr})"
    return expr, exclude_parts


def build_query(terms, domains):
    include_expr, exclude_parts = build_keyword_expression(terms)

    parts = []
    if domains:
        if len(domains) == 1:
            parts.append(f"site:{domains[0]}")
        else:
            site_expr = " OR ".join(f"site:{d}" for d in domains)
            parts.append(f"({site_expr})")

    if include_expr:
        parts.append(include_expr)

    for ex in exclude_parts:
        parts.append(f"-{ex}")

    return " ".join(p for p in parts if p).strip()


@app.route("/api/sites", methods=["GET"])
def get_sites():
    return jsonify(ATS_SITES)


@app.route("/api/build", methods=["POST"])
def build():
    data = request.get_json(force=True) or {}
    terms = data.get("terms", [])
    site_ids = data.get("siteIds", [])
    custom_domains = data.get("customDomains", [])
    engine = data.get("engine", "google")

    if not any((t.get("value") or "").strip() for t in terms):
        return jsonify({"error": "At least one keyword is required."}), 400

    selected_domains = [s["domain"] for s in ATS_SITES if s["id"] in site_ids]
    selected_domains.extend([d.strip() for d in custom_domains if d.strip()])

    if not selected_domains:
        return jsonify({"error": "Select at least one job board."}), 400

    engine_url = SEARCH_ENGINES.get(engine, SEARCH_ENGINES["google"])

    combined_query = build_query(terms, selected_domains)
    combined_url = engine_url.format(q=urllib.parse.quote(combined_query))

    per_site = []
    for domain in selected_domains:
        q = build_query(terms, [domain])
        url = engine_url.format(q=urllib.parse.quote(q))
        per_site.append({"domain": domain, "query": q, "url": url})

    return jsonify(
        {
            "combinedQuery": combined_query,
            "combinedUrl": combined_url,
            "perSite": per_site,
        }
    )


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
