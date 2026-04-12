#!/usr/bin/env python3
"""
DormToHome Debugging Agent — Round 2
======================================
Checks for: emoji usage, ticket tab sorting bug, filter stacking,
route stop display, time-of-day filter contrast.

Usage:
    python debug_agent_r2.py              # scan codebase only
    python debug_agent_r2.py --fix        # + show fix hints
    python debug_agent_r2.py --live       # + probe running server
    python debug_agent_r2.py --json       # machine-readable output

Run from repo root:  cd dormtohome && python debug_agent_r2.py
"""

import os
import re
import sys
import json
import argparse
import textwrap
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────

REPO_ROOT   = Path(".")
FRONTEND    = REPO_ROOT / "public" / "app.js"
HTML_FILE   = REPO_ROOT / "public" / "index.html"
ROUTES_FILE = REPO_ROOT / "routes" / "routes.js"
API_ROUTE   = REPO_ROOT / "routes" / "api.js"
DB_FILE     = REPO_ROOT / "db" / "database.js"
BASE_URL    = "http://localhost:3000"
DEMO_PASSENGER = {"email": "alex@tamu.edu", "password": "password123"}

# Emojis we want to eliminate
EMOJI_TARGETS = {
    "📍": "pin icon",
    "📅": "calendar icon",
    "🕐": "clock icon",
    "💺": "seat icon",
    "🧑‍✈️": "driver/person icon",
    "🚌": "bus icon",
    "📝": "note/document icon",
    "💡": "lightbulb icon",
    "✅": "checkmark icon",
    "ℹ️": "info icon",
    "⏱": "timer icon",
}


# ─── DATA MODEL ───────────────────────────────────────────────

@dataclass
class BugResult:
    bug_id: str
    title: str
    section: str
    priority: str
    status: str      # CONFIRMED, LIKELY_FIXED, NEEDS_MANUAL_CHECK
    file: str
    line: Optional[int] = None
    evidence: str = ""
    fix_hint: str = ""
    details: str = ""


# ─── FILE UTILITIES ───────────────────────────────────────────

def read_file(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return None


def find_line(content: str, pattern: str) -> list[tuple[int, str]]:
    results = []
    for i, line in enumerate(content.splitlines(), 1):
        if pattern in line:
            results.append((i, line.strip()))
    return results


def find_function(content: str, func_name: str) -> Optional[tuple[int, int]]:
    lines = content.splitlines()
    start = None
    depth = 0
    for i, line in enumerate(lines, 1):
        if start is None:
            if re.search(rf'(function\s+{func_name}\b|{func_name}\s*=\s*(async\s+)?function|\b{func_name}\s*\()', line):
                start = i
                depth = line.count('{') - line.count('}')
        else:
            depth += line.count('{') - line.count('}')
            if depth <= 0:
                return (start, i)
    return (start, start + 30) if start else None


def extract_function_body(content: str, func_name: str) -> Optional[str]:
    bounds = find_function(content, func_name)
    if not bounds:
        return None
    lines = content.splitlines()
    return "\n".join(lines[bounds[0]-1:bounds[1]])


# ─── EMOJI CHECKS ────────────────────────────────────────────

def check_emoji_usage(fe: str) -> list[BugResult]:
    """Scan the entire frontend for each target emoji."""
    results = []
    has_icon_helper = "const ICON" in fe or "ICON = {" in fe

    # Check for ICON helper first
    results.append(BugResult(
        bug_id="E.0",
        title="SVG ICON helper object exists",
        section="Emoji Replacement",
        priority="P2",
        status="LIKELY_FIXED" if has_icon_helper else "CONFIRMED",
        file=str(FRONTEND),
        evidence="ICON helper object found." if has_icon_helper
                 else "No ICON helper object found — SVG icons not set up yet.",
        fix_hint="Add const ICON = { pin: ..., calendar: ..., clock: ..., seat: ..., driver: ..., bus: ..., note: ..., lightbulb: ..., timer: ... } at the top of app.js."
    ))

    for emoji, description in EMOJI_TARGETS.items():
        hits = find_line(fe, emoji)
        # Filter out hits that are inside comments or strings that are notification message templates
        # (driver notifications that get sent as messages can keep emojis in some cases)

        if hits:
            locations = ", ".join([f"line {h[0]}" for h in hits[:8]])
            extra = f" (+{len(hits)-8} more)" if len(hits) > 8 else ""
            results.append(BugResult(
                bug_id=f"E.{emoji}",
                title=f"Emoji '{emoji}' ({description}) still in use",
                section="Emoji Replacement",
                priority="P2",
                status="CONFIRMED",
                file=str(FRONTEND),
                line=hits[0][0],
                evidence=f"Found {len(hits)} occurrence(s) at {locations}{extra}.",
                fix_hint=f"Replace '{emoji}' with the corresponding ICON.xxx() SVG helper call.",
                details=f"Occurrences: {[h[0] for h in hits]}"
            ))
        else:
            results.append(BugResult(
                bug_id=f"E.{emoji}",
                title=f"Emoji '{emoji}' ({description}) removed",
                section="Emoji Replacement",
                priority="P2",
                status="LIKELY_FIXED",
                file=str(FRONTEND),
                evidence=f"No occurrences of '{emoji}' found in frontend code."
            ))

    return results


# ─── TICKET TAB CHECKS ───────────────────────────────────────

def check_ticket_tab_sorting(fe: str) -> BugResult:
    """Check if ticket tabs properly split active vs inactive by date."""
    func = extract_function_body(fe, "buildTicketsPage") or ""
    func2 = extract_function_body(fe, "showTicketTab") or ""

    # Good signs: date comparison with today, separate active/inactive arrays
    has_date_compare = bool(re.search(r'new Date\(.*departure_date', func) or
                           re.search(r'departure_date.*[<>]=?\s*today', func, re.I))
    has_two_arrays = ("active" in func.lower() and "inactive" in func.lower()) or \
                     ("active" in func.lower() and "former" in func.lower()) or \
                     ("active" in func.lower() and "past" in func.lower())
    has_tab_function = "showTicketTab" in fe

    # Bad signs: no date filtering at all
    maps_all_bookings = "bookings.map" in func and not has_date_compare

    all_good = has_date_compare and has_two_arrays and has_tab_function

    return BugResult(
        bug_id="T.1",
        title="Ticket tabs don't properly sort active vs inactive tickets",
        section="My Tickets",
        priority="P0",
        status="LIKELY_FIXED" if all_good else "CONFIRMED",
        file=str(FRONTEND),
        line=find_function(fe, "buildTicketsPage")[0] if find_function(fe, "buildTicketsPage") else None,
        evidence=(
            f"buildTicketsPage() date comparison: {has_date_compare}, "
            f"separate arrays: {has_two_arrays}, "
            f"showTicketTab function: {has_tab_function}, "
            f"maps all bookings without filtering: {maps_all_bookings}"
        ),
        fix_hint="Split bookings array by comparing departure_date against today. "
                 "Use T23:59:59 so today's date counts as active. "
                 "showTicketTab() should fully re-render from S.allBookings."
    )


def check_ticket_tab_name(fe: str) -> BugResult:
    """Check if tab says 'Inactive Tickets' (not 'Former' or 'Past')."""
    has_inactive = find_line(fe, "Inactive Tickets")
    has_former = find_line(fe, "Former Tickets")
    has_past = find_line(fe, ">Past<")
    return BugResult(
        bug_id="T.2",
        title="Tab should say 'Inactive Tickets' instead of 'Former Tickets' or 'Past'",
        section="My Tickets",
        priority="P3",
        status="LIKELY_FIXED" if has_inactive else "CONFIRMED",
        file=str(FRONTEND),
        line=(has_former or has_past or [None])[0][0] if (has_former or has_past) else None,
        evidence="Tab says 'Inactive Tickets'" if has_inactive
                 else f"Tab still says {'Former Tickets' if has_former else 'Past'}.",
        fix_hint="Rename tab label to 'Inactive Tickets'."
    )


# ─── FILTER CHECKS ───────────────────────────────────────────

def check_filter_stacking(fe: str) -> BugResult:
    """Check if filters support multiple cities (OR logic)."""
    func = extract_function_body(fe, "applyFilterPanel") or ""

    # Good signs: reads ALL chips, uses .some() or OR logic, departures is an array
    uses_array = "departures" in fe or "savedFilters.departure = [" in fe
    reads_all_chips = "Array.from(chips)" in func or "chips.forEach" in func
    has_or_logic = ".some(" in func

    # Bad sign: chips[0] (only first chip)
    uses_only_first = "chips[0]" in func and not reads_all_chips

    all_good = (uses_array or reads_all_chips) and not uses_only_first

    return BugResult(
        bug_id="F.1",
        title="Filters don't stack — selecting multiple cities only uses the first",
        section="Filters",
        priority="P0",
        status="LIKELY_FIXED" if all_good else "CONFIRMED",
        file=str(FRONTEND),
        line=find_function(fe, "applyFilterPanel")[0] if find_function(fe, "applyFilterPanel") else None,
        evidence=(
            f"Uses array for departures: {uses_array}, "
            f"reads all chips: {reads_all_chips}, "
            f"only reads chips[0]: {uses_only_first}, "
            f"has OR logic (.some): {has_or_logic}"
        ),
        fix_hint="Change savedFilters.departure from string to departures array. "
                 "Read ALL chips with Array.from(). "
                 "Use .some() for OR matching when filtering routes/requests."
    )


def check_clear_request_filters(fe: str) -> BugResult:
    """Check if route requests tab has a clear filters button."""
    has_clear = "clearRequestFilters" in fe or "clear-req-filters" in fe
    # Also check if a generic clear covers requests
    has_any_clear = "clearAllFilters" in fe or "clearRequestFilters" in fe

    return BugResult(
        bug_id="F.2",
        title="No 'Clear Filters' button on route requests tab",
        section="Filters",
        priority="P1",
        status="LIKELY_FIXED" if has_clear else "CONFIRMED",
        file=str(FRONTEND),
        evidence="clearRequestFilters function found." if has_clear
                 else "No clear-filter mechanism found for the requests tab.",
        fix_hint="Add a 'Clear' button to the request filter bar. "
                 "clearRequestFilters() resets savedFilters and re-renders #req-list."
    )


def check_request_time_filter(fe: str) -> BugResult:
    """Check if route requests tab has a Time of Day filter."""
    # Look for the time filter chip in the requests tab section
    func = extract_function_body(fe, "buildRoutesPage") or ""

    # Find the tab-requested section
    req_tab_start = func.find('id="tab-requested"')
    if req_tab_start == -1:
        req_tab_section = ""
    else:
        req_tab_section = func[req_tab_start:req_tab_start + 800]

    has_time_chip = "Time of Day" in req_tab_section or "time'" in req_tab_section
    # Also check if request filters handle time
    apply_func = extract_function_body(fe, "applyRequestFilters") or ""
    filters_time = "time" in apply_func and ("hour" in apply_func or "getHours" in apply_func or "matchTimeRange" in apply_func)

    return BugResult(
        bug_id="F.3",
        title="No Time of Day filter for route requests",
        section="Filters",
        priority="P1",
        status="LIKELY_FIXED" if (has_time_chip and filters_time) else "CONFIRMED",
        file=str(FRONTEND),
        evidence=(
            f"Time chip in requests tab: {has_time_chip}, "
            f"applyRequestFilters handles time: {filters_time}"
        ),
        fix_hint="Add a Time of Day filter chip to the route requests filter bar. "
                 "applyRequestFilters() should filter by requested_time hour."
    )


# ─── ROUTE DETAIL CHECKS ─────────────────────────────────────

def check_route_stops_always_shown(fe: str) -> BugResult:
    """Check if departure/arrival stops are shown even when no intermediate stops exist."""
    func = extract_function_body(fe, "openRouteDetail") or ""

    # Bad: stops section wrapped in stops.length conditional
    conditional_stops = "stops.length ?" in func and "Route Stops" in func
    # Good: departure and arrival always shown regardless of stops.length
    always_shows_dep_arr = ("from_city" in func and "to_city" in func and
                           "Route Stops" in func and "stops.length ?" not in func)
    # Also good: the conditional only wraps intermediate stops, not the whole section
    dep_outside_conditional = func.find("from_city") < func.find("stops.length") if "stops.length" in func else True

    return BugResult(
        bug_id="R.1",
        title="Routes without intermediate stops don't show departure/arrival when clicked",
        section="Active Routes",
        priority="P0",
        status="LIKELY_FIXED" if always_shows_dep_arr else "CONFIRMED",
        file=str(FRONTEND),
        line=find_function(fe, "openRouteDetail")[0] if find_function(fe, "openRouteDetail") else None,
        evidence=(
            "The entire stops section is wrapped in a `stops.length ?` conditional — "
            "routes with no intermediate stops show nothing." if conditional_stops
            else "Departure/arrival stops appear outside the stops.length conditional."
        ),
        fix_hint="Always show departure and arrival as the first/last stop. "
                 "Only conditionally render intermediate stops with stops.length. "
                 "Also fix: use s.type instead of s.stop_type (column name mismatch).",
        details="Seed data only adds stops for route r-001 (DTH-201). Routes r-002 through r-005 have zero stops."
    )


def check_stop_type_field(fe: str) -> BugResult:
    """Check if frontend uses s.type (correct) or s.stop_type (wrong)."""
    uses_stop_type = find_line(fe, "stop_type")
    uses_type = find_line(fe, "s.type===")
    return BugResult(
        bug_id="R.2",
        title="Frontend uses s.stop_type but database column is 'type'",
        section="Active Routes",
        priority="P1",
        status="CONFIRMED" if uses_stop_type and not uses_type else "LIKELY_FIXED",
        file=str(FRONTEND),
        line=uses_stop_type[0][0] if uses_stop_type else None,
        evidence=f"Found s.stop_type at lines: {[h[0] for h in uses_stop_type]}" if uses_stop_type
                 else "Using s.type (correct).",
        fix_hint="Change all s.stop_type references to s.type in the stops rendering code."
    )


def check_time_filter_contrast(fe: str) -> BugResult:
    """Check if Time of Day filter buttons have explicit text color for readability."""
    func = extract_function_body(fe, "openFilterPanel") or ""

    # Find the time filter button template
    time_section_start = func.find("type === 'time'")
    if time_section_start == -1:
        return BugResult(
            bug_id="R.3",
            title="Time of Day filter button text contrast",
            section="Active Routes",
            priority="P1",
            status="NEEDS_MANUAL_CHECK",
            file=str(FRONTEND),
            evidence="Could not locate time filter section in openFilterPanel()."
        )

    time_section = func[time_section_start:time_section_start + 1000]

    # Check if unselected buttons have explicit color
    has_explicit_color = "color:var(--navy" in time_section
    # Check deactivation handler sets explicit color (not empty string)
    deactivation = re.search(r"this\.style\.color=this\.classList.*\?.*:['\"](.*?)['\"]", time_section)
    deactivation_color = deactivation.group(1) if deactivation else None
    bad_deactivation = deactivation_color == "" or deactivation_color is None

    return BugResult(
        bug_id="R.3",
        title="Time of Day filter button text is hard to read (low contrast)",
        section="Active Routes",
        priority="P1",
        status="CONFIRMED" if (not has_explicit_color or bad_deactivation) else "LIKELY_FIXED",
        file=str(FRONTEND),
        evidence=(
            f"Explicit color on unselected buttons: {has_explicit_color}. "
            f"Deactivation color set to: '{deactivation_color}' "
            f"({'empty string — inherits white' if bad_deactivation else 'explicit dark color — good'})"
        ),
        fix_hint="Add color:var(--navy-dark) to the default button style. "
                 "Set deactivation toggle to 'var(--navy-dark)' instead of empty string."
    )


# ─── LIVE SERVER PROBES ──────────────────────────────────────

def probe_server(base_url: str) -> list[BugResult]:
    """Hit live endpoints to verify bugs. Requires --live flag and 'requests' package."""
    import requests
    results = []
    session = requests.Session()

    # Check server running
    try:
        r = session.get(f"{base_url}/", timeout=5)
        if r.status_code != 200:
            results.append(BugResult("LIVE.0", "Server unreachable", "Server", "P0", "CONFIRMED",
                                     base_url, evidence=f"GET / returned {r.status_code}"))
            return results
    except Exception as e:
        results.append(BugResult("LIVE.0", "Server unreachable", "Server", "P0", "CONFIRMED",
                                 base_url, evidence=str(e),
                                 fix_hint="Start the server with: npm start"))
        return results

    results.append(BugResult("LIVE.0", "Server is running", "Server", "INFO", "OK", base_url))

    # Login
    r = session.post(f"{base_url}/api/auth/login", json=DEMO_PASSENGER)
    if r.status_code != 200:
        results.append(BugResult("LIVE.1", "Cannot login", "Auth", "P0", "CONFIRMED",
                                 "routes/auth.js", evidence=f"Status {r.status_code}"))
        return results
    token = r.json().get("token", "")
    headers = {"Authorization": f"Bearer {token}"}

    # --- Test route stops ---
    r = session.get(f"{base_url}/api/routes", timeout=5)
    if r.status_code == 200:
        routes = r.json()
        routes_with_stops = 0
        routes_without_stops = 0
        for route in routes:
            stops = route.get("stops", [])
            if stops:
                routes_with_stops += 1
            else:
                routes_without_stops += 1

        if routes_without_stops > 0:
            results.append(BugResult(
                "LIVE.2", "Routes exist without any stops",
                "Active Routes", "P0",
                "CONFIRMED" if routes_without_stops > 0 else "OK",
                "db/database.js",
                evidence=f"{routes_with_stops} routes have stops, {routes_without_stops} have NO stops. "
                         f"Routes without stops won't show departure/arrival in the detail modal "
                         f"unless the frontend always renders them.",
                fix_hint="Frontend fix: always show from_city/to_city as first/last stop. "
                         "Optional DB fix: seed stops for all routes."
            ))

    # --- Test multi-city filter ---
    r1 = session.get(f"{base_url}/api/routes?from=College", timeout=5)
    r2 = session.get(f"{base_url}/api/routes?from=Houston", timeout=5)
    if r1.status_code == 200 and r2.status_code == 200:
        college_routes = r1.json()
        houston_routes = r2.json()
        combined_count = len(college_routes) + len(houston_routes)
        results.append(BugResult(
            "LIVE.3", "Multi-city filter test (backend only supports single city)",
            "Filters", "P0", "NEEDS_MANUAL_CHECK",
            "routes/routes.js",
            evidence=f"'from=College' returned {len(college_routes)} routes, "
                     f"'from=Houston' returned {len(houston_routes)} routes. "
                     f"Combined: {combined_count}. "
                     f"Backend doesn't support OR queries — multi-city must be done client-side.",
            fix_hint="Client-side: when multiple departures selected, fetch all routes then filter with .some()."
        ))

    # --- Test ticket dates ---
    r = session.get(f"{base_url}/api/bookings/mine", headers=headers, timeout=5)
    if r.status_code == 200:
        bookings = r.json()
        today = datetime.now().date()
        active = [b for b in bookings if _parse_date(b.get("departure_date", "")) >= today]
        inactive = [b for b in bookings if _parse_date(b.get("departure_date", "")) < today]
        results.append(BugResult(
            "LIVE.4", "Ticket date distribution",
            "My Tickets", "INFO", "OK",
            "routes/api.js",
            evidence=f"User has {len(bookings)} total bookings: "
                     f"{len(active)} active (today or future), {len(inactive)} inactive (past). "
                     f"Frontend must split these correctly."
        ))

    return results


def _parse_date(date_str: str):
    """Parse a date string, return date object. Fallback to epoch."""
    from datetime import date
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return date(1970, 1, 1)


# ─── REPORT ───────────────────────────────────────────────────

COLORS = {
    "CONFIRMED": "\033[91m",
    "LIKELY_FIXED": "\033[92m",
    "NEEDS_MANUAL_CHECK": "\033[93m",
    "OK": "\033[92m",
    "INFO": "\033[94m",
}
RESET = "\033[0m"
BOLD  = "\033[1m"


def print_report(results: list[BugResult], show_fixes: bool = False):
    confirmed = [r for r in results if r.status == "CONFIRMED"]
    fixed     = [r for r in results if r.status == "LIKELY_FIXED"]
    manual    = [r for r in results if r.status == "NEEDS_MANUAL_CHECK"]

    print(f"""
{'='*72}
  DormToHome Debug Agent — Round 2 Report
  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*72}

  SUMMARY
  ───────
  🔴 Bugs confirmed:     {len(confirmed)}
  🟢 Likely fixed:       {len(fixed)}
  🟡 Needs manual check: {len(manual)}
  Total checks:          {len(results)}
""")

    sections = {}
    for r in results:
        sections.setdefault(r.section, []).append(r)

    for section, bugs in sections.items():
        print(f"\n{'─'*72}")
        print(f"  {BOLD}{section.upper()}{RESET}")
        print(f"{'─'*72}")
        for r in sorted(bugs, key=lambda x: x.bug_id):
            color = COLORS.get(r.status, "")
            icon = {"CONFIRMED": "🔴", "LIKELY_FIXED": "🟢", "NEEDS_MANUAL_CHECK": "🟡",
                    "OK": "✅", "INFO": "ℹ️"}.get(r.status, "❓")

            print(f"\n  {icon}  [{r.priority}] {r.bug_id} — {r.title}")
            print(f"     {color}{r.status}{RESET}")
            print(f"     File: {r.file}{f':{r.line}' if r.line else ''}")
            if r.evidence:
                wrapped = textwrap.fill(r.evidence, width=64,
                                        initial_indent="     ", subsequent_indent="     ")
                print(wrapped)
            if r.details:
                print(f"     {BOLD}Detail:{RESET} {r.details}")
            if show_fixes and r.fix_hint and r.status == "CONFIRMED":
                print(f"     {BOLD}Fix:{RESET}")
                for line in r.fix_hint.split(". "):
                    if line.strip():
                        print(f"       → {line.strip()}")

    # Emoji summary
    emoji_results = [r for r in results if r.section == "Emoji Replacement" and r.status == "CONFIRMED"]
    if emoji_results:
        print(f"\n{'='*72}")
        print(f"  EMOJI CLEANUP SUMMARY")
        print(f"{'='*72}")
        total_occurrences = 0
        for r in emoji_results:
            if r.details and r.details.startswith("Occurrences:"):
                try:
                    occ = eval(r.details.replace("Occurrences: ", ""))
                    total_occurrences += len(occ)
                except:
                    pass
        print(f"\n  {len(emoji_results)} emoji types still in use")
        print(f"  ~{total_occurrences} total occurrences to replace")
        print(f"  Run: grep -nP '[\\x{{1F300}}-\\x{{1F9FF}}]' public/app.js")

    # Priority breakdown
    print(f"\n{'='*72}")
    print(f"  PRIORITY BREAKDOWN OF CONFIRMED BUGS")
    print(f"{'='*72}")
    for p in ["P0", "P1", "P2", "P3"]:
        p_bugs = [r for r in confirmed if r.priority == p]
        if p_bugs:
            label = {"P0": "CRITICAL", "P1": "HIGH", "P2": "MEDIUM", "P3": "LOW"}[p]
            print(f"\n  {p} ({label}): {len(p_bugs)} bugs")
            for r in p_bugs:
                print(f"    • {r.bug_id} — {r.title}")

    print(f"\n{'='*72}\n")


def output_json(results: list[BugResult]):
    data = {
        "generated": datetime.now().isoformat(),
        "round": 2,
        "summary": {
            "confirmed": len([r for r in results if r.status == "CONFIRMED"]),
            "likely_fixed": len([r for r in results if r.status == "LIKELY_FIXED"]),
            "needs_manual_check": len([r for r in results if r.status == "NEEDS_MANUAL_CHECK"]),
            "total": len(results),
        },
        "bugs": [asdict(r) for r in results],
    }
    print(json.dumps(data, indent=2))


# ─── MAIN ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DormToHome Debug Agent — Round 2")
    parser.add_argument("--live", action="store_true", help="Probe running server at localhost:3000")
    parser.add_argument("--fix", action="store_true", help="Show fix hints for confirmed bugs")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--url", default=BASE_URL, help="Base URL (default: http://localhost:3000)")
    args = parser.parse_args()

    fe = read_file(FRONTEND)
    if not fe:
        print(f"ERROR: Cannot find {FRONTEND}. Run from repo root: cd dormtohome && python debug_agent_r2.py")
        sys.exit(1)

    db = read_file(DB_FILE) or ""

    results: list[BugResult] = []

    print("🔍 Scanning codebase (Round 2)..." if not args.json else "", file=sys.stderr)

    # Emoji checks
    results.extend(check_emoji_usage(fe))

    # Ticket tab checks
    results.append(check_ticket_tab_sorting(fe))
    results.append(check_ticket_tab_name(fe))

    # Filter checks
    results.append(check_filter_stacking(fe))
    results.append(check_clear_request_filters(fe))
    results.append(check_request_time_filter(fe))

    # Route detail checks
    results.append(check_route_stops_always_shown(fe))
    results.append(check_stop_type_field(fe))
    results.append(check_time_filter_contrast(fe))

    # Live probes
    if args.live:
        print("🌐 Probing live server..." if not args.json else "", file=sys.stderr)
        try:
            results.extend(probe_server(args.url))
        except ImportError:
            print("ERROR: --live requires 'requests'. Install: pip install requests", file=sys.stderr)
            sys.exit(1)

    if args.json:
        output_json(results)
    else:
        print_report(results, show_fixes=args.fix)


if __name__ == "__main__":
    main()
