"""Generate a Mermaid decision graph from NCG_FL_2020.cql.

Parses the `define "TreatmentGroup": case ... end` block in
cql/NCG_FL_2020.cql and emits one decision node per `when` clause.

Run: python3 visualization/cql_to_flowchart.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CQL = ROOT / "cql" / "NCG_FL_2020.cql"
OUT = Path(__file__).resolve().parent / "treatment_group_flow.generated.mmd"


def define_body(src: str, name: str) -> str:
    m = re.search(r'define\s+"%s":\s*(.*?)(?=\n\s*(?:/\*|define\s)|\Z)' % re.escape(name), src, re.S)
    if not m:
        sys.exit(f"define \"{name}\" not found in {CQL}")
    return m.group(1)


def esc(text: str) -> str:
    return text.replace('"', "'").strip()


def parse_regimens(src: str) -> dict:
    body = define_body(src, "RecommendedRegimens")
    out = {}
    for m in re.finditer(r"when\s+'([^']+)'\s+then\s+\{(.*?)\}", body, re.S):
        out[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return out


def main() -> None:
    src = CQL.read_text()
    body = define_body(src, "TreatmentGroup")
    whens = re.findall(r"when\s+(.*?)\s+then\s+'([^']+)'", body)
    else_m = re.search(r"else\s+'([^']+)'", body)
    regimens = parse_regimens(src)

    lines = ["flowchart TD", "    start([Follicular Lymphoma FHIR Bundle]):::start"]
    outcomes = {}

    def outcome_node(result: str) -> str:
        if result not in outcomes:
            nid = "out_" + re.sub(r"\W", "_", result)
            items = "<br/>".join(esc(r) for r in regimens.get(result, []))
            label = f"{result}" + (f"<br/>{items}" if items else "")
            cls = "review" if result == "needs-review" else "outcome"
            lines.append(f'    {nid}[/"{label}"/]:::{cls}')
            outcomes[result] = nid
        return outcomes[result]

    prev = "start"
    for i, (cond, result) in enumerate(whens, 1):
        did = f"d{i}"
        lines.append(f'    {did}{{"{esc(cond)}"}}:::decision')
        lines.append(f"    {prev} --> {did}" if prev == "start" else f"    {prev} -- No --> {did}")
        lines.append(f"    {did} -- Yes --> {outcome_node(result)}")
        prev = did
    if else_m:
        lines.append(f"    {prev} -- else --> {outcome_node(else_m.group(1))}")

    lines += [
        "    classDef start fill:#1f2937,color:#fff,stroke:#111;",
        "    classDef decision fill:#fff4cc,stroke:#c99a00,color:#000;",
        "    classDef outcome fill:#d9f2e3,stroke:#2e8b57,color:#000;",
        "    classDef review fill:#ffe0e0,stroke:#c0392b,color:#000;",
    ]
    header = f"%% GENERATED from {CQL.relative_to(ROOT)} by cql_to_flowchart.py -- do not edit.\n"
    OUT.write_text(header + "\n".join(lines) + "\n")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(whens)} decision nodes)")


if __name__ == "__main__":
    main()
