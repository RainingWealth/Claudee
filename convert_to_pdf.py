#!/usr/bin/env python3
"""Convert all campaign markdown files to styled PDFs."""

import os
import markdown
from weasyprint import HTML, CSS
from pathlib import Path

# Base campaign directory
CAMPAIGN_DIR = Path("/home/user/Claudee/campaign")
OUTPUT_DIR = Path("/home/user/Claudee/pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

# CSS styling for clean, professional PDFs
CSS_STYLES = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

* { box-sizing: border-box; }

body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a2e;
    margin: 0;
    padding: 0;
}

@page {
    margin: 2cm 2.2cm 2.2cm 2.2cm;
    @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #9ca3af;
    }
    @bottom-left {
        content: "Meta Campaign Assets — Singapore Financial Advisory";
        font-size: 8pt;
        color: #9ca3af;
    }
}

h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #003366;
    border-bottom: 3px solid #06D6A0;
    padding-bottom: 8px;
    margin-top: 0;
    page-break-before: avoid;
}

h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #003366;
    border-left: 4px solid #06D6A0;
    padding-left: 10px;
    margin-top: 24px;
}

h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #1a1a2e;
    margin-top: 18px;
}

h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #374151;
    margin-top: 14px;
}

p { margin: 8px 0 12px 0; }

ul, ol {
    margin: 8px 0;
    padding-left: 22px;
}

li { margin-bottom: 4px; }

blockquote {
    border-left: 4px solid #06D6A0;
    background: #f0fdf8;
    margin: 14px 0;
    padding: 12px 16px;
    color: #1a1a2e;
    border-radius: 0 6px 6px 0;
}

code {
    font-family: 'Courier New', monospace;
    background: #f3f4f6;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 9.5pt;
    color: #1a1a2e;
}

pre {
    background: #1c1c2e;
    color: #e2e8f0;
    padding: 14px 16px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    overflow-x: auto;
    margin: 14px 0;
    page-break-inside: avoid;
}

pre code {
    background: none;
    color: #e2e8f0;
    padding: 0;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
}

thead tr {
    background: #003366;
    color: white;
}

thead th {
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
}

tbody tr:nth-child(even) { background: #f0f4f8; }
tbody tr:nth-child(odd) { background: #ffffff; }

td {
    padding: 7px 10px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
}

hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 20px 0;
}

strong { color: #003366; }

.cover-page {
    text-align: center;
    padding: 60px 40px;
    background: linear-gradient(135deg, #003366, #005c99);
    color: white;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
"""

# Map of files to their output PDF names
FILES = [
    ("STRATEGY.md", "00-Master-Campaign-Strategy.pdf"),
    ("angle-1-maternity/ad-variants.md", "01a-Maternity-Ad-Variants.pdf"),
    ("angle-1-maternity/lead-magnet.md", "01b-Maternity-Lead-Magnet-Baby-Pack.pdf"),
    ("angle-1-maternity/lead-form.md", "01c-Maternity-Lead-Form.pdf"),
    ("angle-1-maternity/follow-up.md", "01d-Maternity-Follow-Up-Scripts.pdf"),
    ("angle-1-maternity/image-guide.md", "01e-Maternity-Image-Guide.pdf"),
    ("angle-2-cpf55/ad-variants.md", "02a-CPF55-Ad-Variants.pdf"),
    ("angle-2-cpf55/lead-magnet.md", "02b-CPF55-Lead-Magnet-Readiness-Report.pdf"),
    ("angle-2-cpf55/lead-form.md", "02c-CPF55-Lead-Form.pdf"),
    ("angle-2-cpf55/follow-up.md", "02d-CPF55-Follow-Up-Scripts.pdf"),
    ("angle-2-cpf55/image-guide.md", "02e-CPF55-Image-Guide.pdf"),
    ("angle-3-midcareer/ad-variants.md", "03a-Midcareer-Ad-Variants.pdf"),
    ("angle-3-midcareer/lead-magnet.md", "03b-Midcareer-Freedom-Number-Audit.pdf"),
    ("angle-3-midcareer/lead-form.md", "03c-Midcareer-Lead-Form.pdf"),
    ("angle-3-midcareer/follow-up.md", "03d-Midcareer-Follow-Up-Scripts.pdf"),
    ("angle-3-midcareer/image-guide.md", "03e-Midcareer-Image-Guide.pdf"),
]


def md_to_pdf(md_path: Path, pdf_path: Path, title: str) -> None:
    """Convert a single markdown file to a styled PDF."""
    md_text = md_path.read_text(encoding="utf-8")

    # Convert markdown to HTML
    html_content = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "codehilite", "nl2br"],
    )

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>
{html_content}
</body>
</html>"""

    css = CSS(string=CSS_STYLES)
    HTML(string=full_html).write_pdf(str(pdf_path), stylesheets=[css])
    print(f"  ✓  {pdf_path.name}")


def main():
    print("\nConverting campaign markdown files to PDF...\n")
    success = 0
    for rel_path, pdf_name in FILES:
        md_path = CAMPAIGN_DIR / rel_path
        pdf_path = OUTPUT_DIR / pdf_name
        if not md_path.exists():
            print(f"  ✗  MISSING: {rel_path}")
            continue
        try:
            title = md_path.stem.replace("-", " ").replace("_", " ").title()
            md_to_pdf(md_path, pdf_path, title)
            success += 1
        except Exception as e:
            print(f"  ✗  ERROR on {rel_path}: {e}")

    print(f"\nDone. {success}/{len(FILES)} PDFs created in:\n  {OUTPUT_DIR}\n")
    for f in sorted(OUTPUT_DIR.glob("*.pdf")):
        size_kb = f.stat().st_size // 1024
        print(f"  {f.name}  ({size_kb} KB)")


if __name__ == "__main__":
    main()
