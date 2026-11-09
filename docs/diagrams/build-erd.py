#!/usr/bin/env python3
"""Generate the TravelNest ERD (two pages) from the canonical schema.

Page 1  Core Booking Domain  - curated 10-table view for humans.
Page 2  Full Schema          - all 49 tables / 83 FKs, grouped by domain.

Source of truth:
  server/infra/database/schema/baseline.sql   (46 tables, generated dump)
  server/infra/database/migrations/*.js       (3 tables added after that dump:
                                                platform_status_counts,
                                                platform_finance_totals,
                                                saved_payment_methods)

Usage:
  python3 build-erd.py
  python3 <drawio-skill>/scripts/edgeports.py travelnest-data-model.drawio \
      -o travelnest-data-model.drawio
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
BASELINE = REPO / "server/infra/database/schema/baseline.sql"

PK, FK = "PK", "FK"
GREY   = ("#F5F5F5", "#666666")
BLUE   = ("#dae8fc", "#6c8ebf")
GREEN  = ("#d5e8d4", "#82b366")
PURPLE = ("#e1d5e7", "#9673a6")
YELLOW = ("#fff2cc", "#d6b656")
ORANGE = ("#ffe6cc", "#d79b00")
TEAL   = ("#b0e3e6", "#0e8088")

SKIP = {"created_at", "updated_at", "deleted_at"}


def esc(v):
    return (str(v).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# --------------------------------------------------------------------------- #
# schema parsing
# --------------------------------------------------------------------------- #
def parse_baseline():
    sql = BASELINE.read_text()
    stmts = [s.strip() for s in sql.split("-- @@schema-statement@@") if s.strip()]
    tables = {}
    for s in stmts:
        m = re.search(r"CREATE TABLE IF NOT EXISTS `([a-z_]+)` \((.*)\) ENGINE", s, re.S)
        if not m:
            continue
        name, body = m.group(1), m.group(2)
        pk_match = re.search(r"PRIMARY KEY \(([^)]*)\)", body)
        pk = set(re.findall(r"`([a-z0-9_]+)`", pk_match.group(1))) if pk_match else set()
        fks = re.findall(
            r"FOREIGN KEY \(`([a-z0-9_]+)`\) REFERENCES `([a-z_]+)` \(`([a-z0-9_]+)`\)", body)
        fk_cols = {c: (t, r) for c, t, r in fks}
        cols = []
        for cm in re.finditer(r"^\s*`([a-z0-9_]+)`\s+([a-z]+(?:\([^)]*\))?)", body, re.M):
            c, typ = cm.group(1), cm.group(2)
            if c in SKIP:
                continue
            cols.append((c, typ, PK if c in pk else (FK if c in fk_cols else "")))
        tables[name] = cols
    return tables


# tables that only exist as migrations (baseline dump predates them)
MIGRATION_TABLES = {
    "platform_status_counts": [
        ("metric", "varchar(32)", PK), ("status", "varchar(32)", PK),
        ("count", "int", ""), ("computed_at", "datetime", "")],
    "platform_finance_totals": [
        ("metric", "varchar(32)", PK), ("currency", "varchar(3)", PK),
        ("count", "int", ""), ("amount", "decimal(18,2)", ""), ("computed_at", "datetime", "")],
    "saved_payment_methods": [
        ("id", "char(36)", PK), ("user_id", "char(36)", FK),
        ("stripe_customer_id", "varchar(255)", ""), ("stripe_payment_method_id", "varchar(255)", ""),
        ("brand", "varchar(50)", ""), ("last4", "varchar(4)", ""),
        ("exp_month", "int", ""), ("exp_year", "int", ""),
        ("cardholder_name", "varchar(255)", ""), ("is_default", "tinyint(1)", "")],
}

DOMAINS = [
    ("Geography", GREY, ["countries", "cities", "destinations"]),
    ("Property & catalogue", GREEN,
     ["hotels", "hotel_users", "rooms", "room_inventory", "hotel_policies",
      "hotel_cancellation_rules", "hotel_amenities", "amenities",
      "room_amenities", "nearby_places"]),
    ("Identity & access", BLUE,
     ["users", "auth_accounts", "roles", "permissions", "role_permissions",
      "user_roles", "audit_logs"]),
    ("Booking core", PURPLE,
     ["bookings", "booking_rooms", "holds", "hold_rooms"]),
    ("Guest engagement", PURPLE,
     ["reviews", "review_replies", "review_helpful_votes", "review_media",
      "saved_hotels", "viewed_hotels", "notifications"]),
    ("Payments", ORANGE,
     ["transactions", "payments", "refunds", "invoices",
      "connected_payment_accounts", "saved_payment_methods"]),
    ("Ledger & payouts", ORANGE,
     ["payouts", "payout_items", "ledger_accounts", "ledger_entries",
      "idempotency_keys", "webhook_event_logs"]),
    ("Media & analytics", TEAL,
     ["images", "image_variants", "hotel_search_snapshots",
      "hotel_rating_summaries", "platform_status_counts", "platform_finance_totals"]),
]


def pick_columns(cols, max_rows=9):
    """Keep every PK/FK; fill with non-key columns; note what was hidden."""
    keys = [c for c in cols if c[2]]
    rest = [c for c in cols if not c[2] and c[0] not in ("metadata",)]
    room = max(0, max_rows - len(keys))
    shown = keys + rest[:room]
    hidden = len(rest) - min(room, len(rest))
    # restore original schema order
    order = {c[0]: i for i, c in enumerate(cols)}
    shown.sort(key=lambda c: order[c[0]])
    out = [(k, n, t) for (n, t, k) in shown]
    if hidden:
        out.append(("", f"+{hidden} more columns", ""))
    return out


# --------------------------------------------------------------------------- #
# drawing
# --------------------------------------------------------------------------- #
class Page:
    def __init__(self, pid, name):
        self.pid, self.name, self.cells = pid, name, []

    def cell(self, s):
        self.cells.append(s)

    def table(self, cid, parent, x, y, title, cols, colour,
              W=320, RH=22, HDR=28, fs=11):
        bg, stroke = colour
        h = HDR + len(cols) * RH
        self.cell(
            f'<mxCell id="{cid}" value="{esc(title)}" style="shape=table;startSize={HDR};container=1;'
            f'collapsible=0;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;'
            f'resizeLast=1;fillColor={bg};strokeColor={stroke};fontSize=12;" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x}" y="{y}" width="{W}" height="{h}" as="geometry"/></mxCell>')
        ry = HDR
        for i, (k, n, typ) in enumerate(cols):
            rid = f"{cid}__r{i}"
            self.cell(
                f'<mxCell id="{rid}" value="" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;'
                f'swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];'
                f'portConstraint=eastwest;top=0;left=0;right=0;bottom=0;" vertex="1" parent="{cid}">'
                f'<mxGeometry y="{ry}" width="{W}" height="{RH}" as="geometry"/></mxCell>')
            kc = "#b85450" if k == PK else "#6c8ebf"
            self.cell(
                f'<mxCell id="{rid}_k" value="{k}" style="text;html=1;strokeColor=none;fillColor=none;'
                f'align=center;verticalAlign=middle;fontSize=8;fontStyle=1;fontColor={kc};overflow=hidden;'
                f'rotatable=0;" vertex="1" parent="{rid}">'
                f'<mxGeometry width="34" height="{RH}" as="geometry"/></mxCell>')
            bold = "fontStyle=1;" if k == PK else ""
            grey = "fontColor=#9AA3AF;" if not k and n.startswith("+") else ""
            self.cell(
                f'<mxCell id="{rid}_n" value="{esc(n)}" style="text;html=1;strokeColor=none;fillColor=none;'
                f'align=left;verticalAlign=middle;spacingLeft=2;overflow=hidden;rotatable=0;fontSize={fs};'
                f'{bold}{grey}" vertex="1" parent="{rid}">'
                f'<mxGeometry x="34" width="{W-34-104}" height="{RH}" as="geometry"/></mxCell>')
            self.cell(
                f'<mxCell id="{rid}_t" value="{esc(typ)}" style="text;html=1;strokeColor=none;fillColor=none;'
                f'align=left;verticalAlign=middle;spacingLeft=2;overflow=hidden;rotatable=0;fontSize=8;'
                f'fontColor=#6B7280;" vertex="1" parent="{rid}">'
                f'<mxGeometry x="{W-104}" width="104" height="{RH}" as="geometry"/></mxCell>')
            ry += RH
        return h

    def edge(self, eid, src, tgt):
        self.cell(
            f'<mxCell id="{eid}" value="" style="edgeStyle=entityRelationEdgeStyle;html=1;rounded=1;'
            f'startArrow=ERzeroToMany;startFill=1;endArrow=ERmandOne;endFill=1;strokeColor=#8FA8C8;'
            f'strokeWidth=1;endSize=6;startSize=6;" edge="1" parent="1" source="{src}" target="{tgt}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>')

    def xml(self, pw, ph):
        body = "\n        ".join(
            ['<mxCell id="0" />', '<mxCell id="1" parent="0" />'] + self.cells)
        return (f'  <diagram name="{self.name}" id="{self.pid}">\n'
                f'    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" '
                f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{pw}" pageHeight="{ph}" '
                f'math="0" shadow="0" adaptiveColors="auto">\n      <root>\n        {body}\n      </root>\n'
                f'    </mxGraphModel>\n  </diagram>\n')


schema = parse_baseline()
for name, cols in MIGRATION_TABLES.items():
    schema[name] = cols

# sanity: every table assigned to exactly one domain
assigned = [t for _, _, ts in DOMAINS for t in ts]
assert len(assigned) == len(set(assigned)), "duplicate domain assignment"
missing = set(schema) - set(assigned)
assert not missing, f"unassigned tables: {sorted(missing)}"
assert set(assigned) == set(schema), "domain lists reference unknown tables"

# --------------------------------------------------------------------------- #
# page 1 - curated core
# --------------------------------------------------------------------------- #
p1 = Page("travelnest-erd", "Core Booking Domain")
p1.cell('<mxCell id="t" value="TravelNest &#8212; Core Booking Domain (ERD)" style="text;html=1;fontSize=24;'
        'fontStyle=1;align=left;verticalAlign=middle;fontColor=#1E293B;" vertex="1" parent="1">'
        '<mxGeometry x="60" y="20" width="1300" height="40" as="geometry"/></mxCell>')
p1.cell('<mxCell id="sub" value="Curated view &#183; see the Full Schema page for all 49 tables" '
        'style="text;html=1;fontSize=12;align=left;verticalAlign=middle;fontColor=#6B7280;" vertex="1" parent="1">'
        '<mxGeometry x="60" y="64" width="1100" height="22" as="geometry"/></mxCell>')

CORE = [
    ("countries", 60, 80, GREY), ("cities", 60, 250, GREY),
    ("users", 60, 490, BLUE), ("holds", 60, 800, PURPLE),
    ("hotel_users", 520, 80, BLUE), ("hotels", 520, 340, GREEN),
    ("bookings", 520, 660, PURPLE), ("rooms", 980, 80, GREEN),
    ("booking_rooms", 980, 400, PURPLE), ("reviews", 1440, 700, YELLOW),
]
CORE_COLS = {
    "countries": [("id", "char(36)", PK), ("name", "varchar(150)", ""), ("iso_code", "varchar(3)", "")],
    "cities": [("id", "char(36)", PK), ("country_id", "char(36)", FK), ("name", "varchar(150)", ""),
               ("slug", "varchar(200)", ""), ("latitude", "decimal(10,7)", "")],
    "users": [("id", "char(36)", PK), ("email", "varchar(255)", ""), ("keycloak_user_id", "varchar(255)", ""),
              ("first_name", "varchar(255)", ""), ("last_name", "varchar(255)", ""),
              ("status", "enum", ""), ("connect_account_id", "varchar(255)", "")],
    "holds": [("id", "char(36)", PK), ("user_id", "char(36)", FK), ("hotel_id", "char(36)", FK),
              ("booking_id", "char(36)", FK), ("check_in_date", "date", ""), ("check_out_date", "date", ""),
              ("status", "enum", ""), ("expires_at", "datetime", ""), ("total_price", "decimal(10,2)", "")],
    "hotel_users": [("id", "char(36)", PK), ("hotel_id", "char(36)", FK), ("user_id", "char(36)", FK),
                    ("role_id", "char(36)", FK), ("is_primary_owner", "tinyint(1)", "")],
    "hotels": [("id", "char(36)", PK), ("city_id", "char(36)", FK), ("country_id", "char(36)", FK),
               ("name", "varchar(255)", ""), ("hotel_class", "int", ""), ("status", "enum", ""),
               ("min_price", "decimal(10,2)", "")],
    "bookings": [("id", "char(36)", PK), ("booking_code", "varchar(100)", ""), ("buyer_id", "char(36)", FK),
                 ("hotel_id", "char(36)", FK), ("room_id", "char(36)", FK), ("hold_id", "char(36)", FK),
                 ("check_in_date", "date", ""), ("check_out_date", "date", ""), ("status", "enum", ""),
                 ("total_price", "decimal(10,2)", ""), ("currency", "varchar(3)", "")],
    "rooms": [("id", "char(36)", PK), ("hotel_id", "char(36)", FK), ("room_name", "varchar(255)", ""),
              ("room_type", "enum", ""), ("max_guests", "int", ""), ("quantity", "int", ""),
              ("status", "enum", "")],
    "booking_rooms": [("id", "char(36)", PK), ("booking_id", "char(36)", FK), ("room_id", "char(36)", FK),
                      ("quantity", "int", ""), ("subtotal", "decimal(10,2)", ""),
                      ("total_price", "decimal(10,2)", "")],
    "reviews": [("id", "char(36)", PK), ("user_id", "char(36)", FK), ("hotel_id", "char(36)", FK),
                ("booking_id", "char(36)", FK), ("rating_overall", "decimal(3,1)", ""),
                ("status", "enum", ""), ("is_verified", "tinyint(1)", "")],
}
for name, x, y, colour in CORE:
    p1.table(name, "1", x, y, name, CORE_COLS[name], colour, W=340, RH=24, HDR=30)
p1.cell('<mxCell id="lg" value="Legend" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;'
        'strokeColor=#666666;verticalAlign=top;fontStyle=1;fontSize=11;" vertex="1" parent="1">'
        '<mxGeometry x="60" y="1120" width="404" height="176" as="geometry"/></mxCell>')
for i, (lab, c) in enumerate([("Geography", GREY), ("Identity", BLUE), ("Property", GREEN),
                              ("Booking", PURPLE), ("Reviews", YELLOW)]):
    y = 28 + i * 24
    p1.cell(f'<mxCell id="lg{i}s" value="" style="rounded=0;html=1;fillColor={c[0]};strokeColor={c[1]};" '
            f'vertex="1" parent="lg"><mxGeometry x="10" y="{y}" width="26" height="15" as="geometry"/></mxCell>')
    p1.cell(f'<mxCell id="lg{i}t" value="{lab}" style="text;html=1;align=left;verticalAlign=middle;fontSize=11;" '
            f'vertex="1" parent="lg"><mxGeometry x="44" y="{y-3}" width="200" height="20" as="geometry"/></mxCell>')
p1.cell('<mxCell id="lgn" value="PK = primary key  &#183;  FK = foreign key  &#183;  crow&#8217;s foot = many  '
        '&#183;  || = one" style="text;html=1;align=left;verticalAlign=middle;fontSize=10;fontColor=#6B7280;" '
        'vertex="1" parent="lg"><mxGeometry x="10" y="146" width="386" height="22" as="geometry"/></mxCell>')
for i, (child, col, parent) in enumerate([
        ("cities", "country_id", "countries"), ("hotels", "city_id", "cities"),
        ("hotels", "country_id", "countries"), ("rooms", "hotel_id", "hotels"),
        ("hotel_users", "hotel_id", "hotels"), ("hotel_users", "user_id", "users"),
        ("bookings", "buyer_id", "users"), ("bookings", "hotel_id", "hotels"),
        ("bookings", "room_id", "rooms"), ("bookings", "hold_id", "holds"),
        ("holds", "user_id", "users"), ("holds", "hotel_id", "hotels"),
        ("booking_rooms", "booking_id", "bookings"), ("booking_rooms", "room_id", "rooms"),
        ("reviews", "user_id", "users"), ("reviews", "hotel_id", "hotels"),
        ("reviews", "booking_id", "bookings")]):
    p1.edge(f"e{i}", child, parent)

# --------------------------------------------------------------------------- #
# page 2 - full schema
# --------------------------------------------------------------------------- #
p2 = Page("travelnest-erd-full", "Full Schema (49 tables)")
p2.cell('<mxCell id="ft" value="TravelNest &#8212; Full Database Schema (ERD)" style="text;html=1;fontSize=24;'
        'fontStyle=1;align=left;verticalAlign=middle;fontColor=#1E293B;" vertex="1" parent="1">'
        '<mxGeometry x="60" y="20" width="1500" height="40" as="geometry"/></mxCell>')
p2.cell(f'<mxCell id="fsub" value="49 tables &#183; 83 foreign keys &#183; source: baseline.sql + the 3 later '
        f'migrations &#183; non-key columns truncated (see &#34;+N more columns&#34;)" '
        'style="text;html=1;fontSize=12;align=left;verticalAlign=middle;fontColor=#6B7280;" vertex="1" parent="1">'
        '<mxGeometry x="60" y="64" width="1800" height="22" as="geometry"/></mxCell>')

COL_W, TW, RH, HDR, PAD, GAP = 370, 322, 22, 28, 24, 18
COL_X = [60 + i * 390 for i in range(len(DOMAINS))]
TOP = 110

edge_no = 0
for ci, (domain, colour, tables) in enumerate(DOMAINS):
    x = COL_X[ci]
    # measure
    heights = []
    for t in tables:
        cols = pick_columns(schema[t])
        heights.append(HDR + len(cols) * RH)
    ch = HDR + PAD + sum(heights) + GAP * (len(tables) - 1) + PAD
    p2.cell(f'<mxCell id="d{ci}" value="{esc(domain)}" style="swimlane;startSize={HDR};html=1;rounded=1;'
            f'fillColor={colour[0]};strokeColor={colour[1]};verticalAlign=top;fontStyle=1;fontSize=12;'
            f'fontColor=#334155;dashed=1;opacity=38;" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{TOP}" width="{COL_W}" height="{ch}" as="geometry"/></mxCell>')
    y = HDR + PAD
    for t, h in zip(tables, heights):
        cols = pick_columns(schema[t])
        p2.table(f"f_{t}", f"d{ci}", PAD, y, t, cols, colour, W=TW, RH=RH, HDR=HDR, fs=10)
        y += h + GAP

# rebuild FK edges from the baseline + migrations
fk_pairs = []
sql = BASELINE.read_text()
for m in re.finditer(r"CREATE TABLE IF NOT EXISTS `([a-z_]+)` \((.*?)\) ENGINE", sql, re.S):
    child, body = m.group(1), m.group(2)
    for _, ref, _ in re.findall(
            r"FOREIGN KEY \(`([a-z0-9_]+)`\) REFERENCES `([a-z_]+)` \(`([a-z0-9_]+)`\)", body):
        fk_pairs.append((child, ref))
fk_pairs.append(("saved_payment_methods", "users"))

assert ("saved_payment_methods", "users") in fk_pairs
seen = set()
for child, parent in fk_pairs:
    if (child, parent) in seen:
        continue
    seen.add((child, parent))
    p2.edge(f"fe{edge_no}", f"f_{child}", f"f_{parent}")
    edge_no += 1

out = (f'<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="drawio" version="26.0.0">\n'
       + p1.xml(1900, 1400) + p2.xml(60 + len(DOMAINS) * 390 + 40, 2500) + '</mxfile>\n')
(HERE / "travelnest-data-model.drawio").write_text(out)
print(f"page1: {len(p1.cells)} cells | page2: {len(p2.cells)} cells | {edge_no} FK edges | {len(out)} bytes")
