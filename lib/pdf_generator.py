"""
PDF Generator — converts campaign markdown outputs to styled PDFs.
Adapted from the Meta campaign PDF generator in meta-marketing-campaign-n9hAD branch.
"""
import os
from pathlib import Path
from datetime import datetime

try:
    import markdown
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


CSS_STYLES = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

body {
    font-family: 'Inter', sans-serif;
    color: #1a1a2e;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    line-height: 1.7;
}

h1 {
    color: #003366;
    border-bottom: 3px solid #06D6A0;
    padding-bottom: 12px;
    font-size: 2em;
}

h2 {
    color: #003366;
    border-left: 4px solid #06D6A0;
    padding-left: 12px;
    margin-top: 32px;
}

h3 {
    color: #0055a5;
    margin-top: 24px;
}

.header-banner {
    background: linear-gradient(135deg, #003366, #0055a5);
    color: white;
    padding: 30px 40px;
    margin: -40px -40px 40px -40px;
    border-bottom: 4px solid #06D6A0;
}

.header-banner h1 {
    color: white;
    border-bottom: none;
    margin: 0;
    padding: 0;
}

.header-banner .meta {
    color: #06D6A0;
    font-size: 0.9em;
    margin-top: 8px;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 20px 0;
}

th {
    background: #003366;
    color: white;
    padding: 10px 14px;
    text-align: left;
}

td {
    padding: 9px 14px;
    border-bottom: 1px solid #e0e0e0;
}

tr:nth-child(even) td {
    background: #f5f9ff;
}

blockquote {
    border-left: 4px solid #06D6A0;
    margin: 20px 0;
    padding: 12px 20px;
    background: #f0faf6;
    border-radius: 0 8px 8px 0;
}

code {
    background: #f0f4ff;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
}

pre code {
    display: block;
    padding: 16px;
    overflow-x: auto;
}

ul, ol {
    padding-left: 24px;
}

li {
    margin: 6px 0;
}

.page-break {
    page-break-after: always;
}

@page {
    margin: 0;
    size: A4;
}
"""


def markdown_to_html(md_content: str, title: str, campaign_name: str) -> str:
    """Convert markdown content to a styled HTML document."""
    md = markdown.markdown(
        md_content,
        extensions=["tables", "fenced_code", "nl2br"]
    )
    generated_at = datetime.now().strftime("%B %d, %Y")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>{CSS_STYLES}</style>
</head>
<body>
    <div class="header-banner">
        <h1>{title}</h1>
        <div class="meta">Campaign: {campaign_name} &nbsp;|&nbsp; Generated: {generated_at}</div>
    </div>
    {md}
</body>
</html>"""


def generate_pdfs(campaign_dir: Path) -> list[Path]:
    """
    Convert all .md files in a campaign directory to PDFs.
    Returns list of generated PDF paths.
    """
    if not WEASYPRINT_AVAILABLE:
        print("[PDF] WeasyPrint not installed — skipping PDF generation.")
        print("[PDF] Install with: pip install weasyprint markdown")
        return []

    pdf_dir = campaign_dir / "pdfs"
    pdf_dir.mkdir(exist_ok=True)

    md_files = sorted(campaign_dir.rglob("*.md"))
    generated = []

    for md_file in md_files:
        relative = md_file.relative_to(campaign_dir)
        title = md_file.stem.replace("-", " ").replace("_", " ").title()
        campaign_name = campaign_dir.name

        md_content = md_file.read_text(encoding="utf-8")
        html_content = markdown_to_html(md_content, title, campaign_name)

        # Flatten subdirectory structure in PDF filenames
        pdf_name = str(relative).replace("/", "-").replace("\\", "-").replace(".md", ".pdf")
        pdf_path = pdf_dir / pdf_name

        try:
            weasyprint.HTML(string=html_content).write_pdf(str(pdf_path))
            generated.append(pdf_path)
            print(f"[PDF] Generated: {pdf_path.name}")
        except Exception as e:
            print(f"[PDF] Failed to generate {pdf_name}: {e}")

    return generated
