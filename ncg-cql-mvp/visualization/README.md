# CQL visualization

Graph views of `cql/NCG_CLL_2019.cql` (decision nodes, branches, outcomes).
Files are Mermaid (`.mmd`); they render in GitHub, VS Code (Mermaid preview
extension), and at <https://mermaid.live>.

| File | What it is |
|------|-----------|
| `clinical_flow.mmd` | Hand-authored, clinician-friendly flow: eligibility gate -> high-risk cytogenetics -> fitness -> group/regimens, with the data-provenance (`IsUsable`) checks shown. |
| `treatment_group_flow.generated.mmd` | Auto-generated from the CQL. One diamond per `when` clause of `TreatmentGroup`, in evaluation order (first match wins). |
| `cql_to_flowchart.py` | The generator. |

## Regenerate after editing the CQL

```bash
python3 visualization/cql_to_flowchart.py
```

The generator uses regex parsing of the `TreatmentGroup` and
`RecommendedRegimens` blocks, so it expects the existing `case / when ... then '...'`
shape. `clinical_flow.mmd` is not generated and must be updated by hand if the
clinical logic changes.

## Optional: export to PNG/SVG

```bash
npx -y @mermaid-js/mermaid-cli -i visualization/clinical_flow.mmd -o visualization/clinical_flow.svg
```
