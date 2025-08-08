#!/usr/bin/env python3
# /// script
# dependencies = [
#     "xhtml2pdf>=0.2.14",
#     "beautifulsoup4>=4.12.2",
# ]
# requires-python = ">=3.11"
# ///

import argparse
import base64
import os
import re
import sys
import tempfile
from email import policy
from email.parser import BytesParser
from pathlib import Path
from typing import Dict

from bs4 import BeautifulSoup
from xhtml2pdf import pisa


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def extract_mht_to_html_and_assets(mht_bytes: bytes, workdir: Path) -> str:
    message = BytesParser(policy=policy.default).parsebytes(mht_bytes)

    # Collect parts by content-id / filename
    cid_to_path: Dict[str, Path] = {}
    html_part: bytes | None = None

    if message.is_multipart():
        for part in message.walk():
            content_type = part.get_content_type()
            if content_type == "text/html" and html_part is None:
                html_part = part.get_content().encode(part.get_content_charset() or "utf-8") if isinstance(part.get_content(), str) else part.get_content()
                continue

            if part.get_content_maintype() in {"image", "audio", "video", "application"}:
                cid = part.get("Content-ID")
                if cid:
                    cid = cid.strip("<>")
                filename = part.get_filename() or (cid or "part")
                safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", filename)
                out_path = workdir / safe_name
                data = part.get_payload(decode=True)
                if data is not None:
                    out_path.write_bytes(data)
                    if cid:
                        cid_to_path[cid] = out_path
    else:
        # Single-part MHT with HTML
        html_part = message.get_content().encode(message.get_content_charset() or "utf-8") if isinstance(message.get_content(), str) else message.get_content()

    if not html_part:
        raise RuntimeError("No HTML part found in MHT")

    html = html_part.decode("utf-8", errors="replace")

    # Replace cid: refs with file paths
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["img", "link", "script", "audio", "video", "source"]):
        attr = "src" if tag.name != "link" else "href"
        if tag.has_attr(attr):
            val = tag.get(attr)
            if isinstance(val, str) and val.startswith("cid:"):
                cid = val[4:]
                if cid in cid_to_path:
                    tag[attr] = cid_to_path[cid].as_posix()

    return str(soup)


def html_to_pdf_with_xhtml2pdf(html: str, out_pdf: Path) -> None:
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    with open(out_pdf, "wb") as f:
        result = pisa.CreatePDF(src=html, dest=f)
        if result.err:
            raise RuntimeError("xhtml2pdf failed with errors")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert MHT/MHTML to PDF using pure-Python path (xhtml2pdf)")
    parser.add_argument(
        "input",
        nargs="?",
        default=str(Path(__file__).resolve().parent.parent / "input-samples/Why is AI so slow to spread_ Economics can explain.mht"),
        help="Path to input .mht/.mhtml file",
    )
    parser.add_argument(
        "--out",
        dest="out",
        default=None,
        help="Output PDF path (default: data/uploads/<basename>.xhtml2pdf.pdf)",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    in_path = Path(args.input).expanduser().resolve()
    if not in_path.exists():
        eprint(f"Input not found: {in_path}")
        return 2

    repo_root = Path(__file__).resolve().parent.parent
    out_default = repo_root / "data/uploads" / (in_path.stem + ".xhtml2pdf.pdf")
    out_pdf = Path(args.out).expanduser().resolve() if args.out else out_default

    mht_bytes = in_path.read_bytes()
    with tempfile.TemporaryDirectory(prefix="mht2pdf_") as tmp:
        workdir = Path(tmp)
        html = extract_mht_to_html_and_assets(mht_bytes, workdir)
        html_to_pdf_with_xhtml2pdf(html, out_pdf)

    size = out_pdf.stat().st_size if out_pdf.exists() else 0
    print(f"xhtml2pdf PDF written: {out_pdf} ({size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


