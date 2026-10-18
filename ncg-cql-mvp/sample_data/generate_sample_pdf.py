"""
Generates synthetic synoptic Follicular Lymphoma pathology/staging reports
matching the NCG Hematolymphoid Management Guidelines layout.

Cases generated:
  1. sample_fl_case_advanced_high_burden.pdf  -> advanced-high-burden-br
  2. sample_fl_case_stage1_limited.pdf        -> stage-1-rt-fit
  3. sample_fl_case_advanced_low_burden.pdf   -> advanced-low-burden
  4. sample_fl_case_ambiguous_referral.pdf    -> needs-review
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUT_DIR = os.path.dirname(__file__)


def _build_pdf(filename: str, title: str, subtitle: str, fields: list, notes: str = None):
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, filename),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=2,
    )
    sub_style = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=14,
    )
    label_style = ParagraphStyle(
        "FieldLabel",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#334155"),
    )
    val_style = ParagraphStyle(
        "FieldValue",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )

    story = [
        Paragraph(title, title_style),
        Paragraph(subtitle, sub_style),
        Spacer(1, 8),
    ]

    table_data = []
    for label, val in fields:
        table_data.append([
            Paragraph(f"{label}:", label_style),
            Paragraph(str(val), val_style),
        ])

    table = Table(table_data, colWidths=[240, 290])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(table)

    if notes:
        story.append(Spacer(1, 14))
        notes_hdr = ParagraphStyle(
            "NotesHdr",
            parent=styles["Normal"],
            fontSize=9,
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#475569"),
        )
        notes_style = ParagraphStyle(
            "NotesText",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748b"),
        )
        story.append(Paragraph("CLINICAL & PATHOLOGY NOTES:", notes_hdr))
        story.append(Spacer(1, 4))
        story.append(Paragraph(notes, notes_style))

    doc.build(story)
    print(f"wrote {filename}")


def generate_all():
    # 1. Advanced Stage III High Burden, Fit -> BR x 6
    _build_pdf(
        "sample_fl_case_advanced_high_burden.pdf",
        "TATA MEMORIAL CENTRE / NCG-HEME - FOLLICULAR LYMPHOMA SYNOPTIC WORKUP",
        "Conforms to NCG Lymphoma Guidelines | ABHA-Linked Diagnostic Record",
        [
            ("Patient Name", "Amit Sharma"),
            ("ABHA ID", "12-3456-7890-1234"),
            ("Age", "56"),
            ("Gender", "Male"),
            ("Report Date", "2026-10-14"),
            ("Histological Subtype & Grade", "Follicular lymphoma, grade 1-2"),
            ("Ann Arbor Stage", "Stage III"),
            ("Bone Marrow Biopsy", "Involved"),
            ("GELF Tumour Burden", "High burden"),
            ("Bulky Mass (> 7 cm)", "Yes"),
            ("B Symptoms", "No"),
            ("Serum LDH Elevated (>ULN)", "No"),
            ("Fit for Bendamustine (BR)", "Yes"),
            ("Fit for Anthracycline / R-CHOP", "Yes"),
            ("Fit and Suitable for RT (ISRT/IFRT)", "No"),
            ("ECOG Performance Status", "1"),
        ],
        "Excisional biopsy of mesenteric mass confirmed Grade 1-2 FL (CD20+, CD10+, BCL2+, BCL6+, Cyclin D1-). "
        "CECT shows retroperitoneal mass 8.2 cm. GELF high tumour burden confirmed. Fit for Bendamustine-Rituximab.",
    )

    # 2. Stage I Limited Stage, Fit for RT -> ISRT 24 Gy
    _build_pdf(
        "sample_fl_case_stage1_limited.pdf",
        "TATA MEMORIAL CENTRE / NCG-HEME - FOLLICULAR LYMPHOMA SYNOPTIC WORKUP",
        "Conforms to NCG Lymphoma Guidelines | Limited Stage Evaluation",
        [
            ("Patient Name", "Priya Patel"),
            ("ABHA ID", "98-7654-3210-9876"),
            ("Age", "48"),
            ("Gender", "Female"),
            ("Report Date", "2026-10-14"),
            ("Histological Subtype & Grade", "Follicular lymphoma, grade 1-2"),
            ("Ann Arbor Stage", "Stage I"),
            ("Bone Marrow Biopsy", "Negative"),
            ("GELF Tumour Burden", "Low burden"),
            ("Bulky Mass (> 7 cm)", "No"),
            ("B Symptoms", "No"),
            ("Serum LDH Elevated (>ULN)", "No"),
            ("Fit for Bendamustine (BR)", "Yes"),
            ("Fit for Anthracycline / R-CHOP", "Yes"),
            ("Fit and Suitable for RT (ISRT/IFRT)", "Yes"),
            ("ECOG Performance Status", "0"),
        ],
        "Excisional biopsy of right cervical level II lymph node (3.2 cm). BM aspiration & trephine negative "
        "for lymphoma. True limited-stage Stage I confirmed. Suitable for curative-intent ISRT 24 Gy.",
    )

    # 3. Stage IV Low Burden, Asymptomatic -> Watchful Waiting
    _build_pdf(
        "sample_fl_case_advanced_low_burden.pdf",
        "TATA MEMORIAL CENTRE / NCG-HEME - FOLLICULAR LYMPHOMA SYNOPTIC WORKUP",
        "Conforms to NCG Lymphoma Guidelines | Indolent Advanced Workup",
        [
            ("Patient Name", "Rajesh Verma"),
            ("ABHA ID", "45-6789-0123-4567"),
            ("Age", "64"),
            ("Gender", "Male"),
            ("Report Date", "2026-10-14"),
            ("Histological Subtype & Grade", "Follicular lymphoma, grade 2"),
            ("Ann Arbor Stage", "Stage IV"),
            ("Bone Marrow Biopsy", "Involved"),
            ("GELF Tumour Burden", "Low burden"),
            ("Bulky Mass (> 7 cm)", "No"),
            ("B Symptoms", "No"),
            ("Serum LDH Elevated (>ULN)", "No"),
            ("Fit for Bendamustine (BR)", "Yes"),
            ("Fit for Anthracycline / R-CHOP", "Yes"),
            ("Fit and Suitable for RT (ISRT/IFRT)", "No"),
            ("ECOG Performance Status", "0"),
        ],
        "Biopsy confirmed FL Grade 2. Low-volume bilateral axillary and inguinal nodes (largest 2.1 cm). "
        "Normal blood counts, no B symptoms, no organ compromise. GELF criteria negative -> Watchful waiting.",
    )

    # 4. Ambiguous Referral Lab Report -> Needs Review
    _build_pdf(
        "sample_fl_case_ambiguous_referral.pdf",
        "TATA MEMORIAL CENTRE / NCG-HEME - FOLLICULAR LYMPHOMA SYNOPTIC WORKUP",
        "External Referral Pathology Report | Unverified Data Quality Flag",
        [
            ("Patient Name", "Meena Roy"),
            ("ABHA ID", "33-4455-6677-8899"),
            ("Age", "61"),
            ("Gender", "Female"),
            ("Report Date", "2026-10-14"),
            ("Histological Subtype & Grade", "B-cell lymphoma with follicular architecture; referral review pending"),
            ("Ann Arbor Stage", "Stage III"),
            ("Bone Marrow Biopsy", "Not done"),
            ("GELF Tumour Burden", "High burden suspected, scan report awaited from outside hospital"),
            ("Bulky Mass (> 7 cm)", "No"),
            ("B Symptoms", "No"),
            ("Serum LDH Elevated (>ULN)", "No"),
            ("Fit for Bendamustine (BR)", "Yes"),
            ("Fit for Anthracycline / R-CHOP", "Yes"),
            ("Fit and Suitable for RT (ISRT/IFRT)", "No"),
            ("ECOG Performance Status", "1"),
        ],
        "Referral pathology block: 'Atypical follicular proliferation, immunohistochemistry pending'. "
        "Data quality provenance flags unparsed text. Safety guardrails require multidisciplinary tumour board review.",
    )


if __name__ == "__main__":
    generate_all()
