#!/usr/bin/env python3
# /// script
# dependencies = [
#     "aspose-pdf>=24.0.0",
# ]
# requires-python = ">=3.11"
# ///

import argparse
import os
import sys
from pathlib import Path


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def convert_mht_to_pdf(input_path: Path, output_path: Path) -> None:
    try:
        import aspose.pdf as ap  # type: ignore
    except Exception as import_err:  # pragma: no cover
        eprint("Failed to import aspose.pdf. Ensure the dependency installed by UV supports your platform.")
        raise import_err

    # Create parent directory for output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Configure MHT load options and perform conversion
    options = ap.mht_load_options.MhtLoadOptions()
    doc = ap.Document(str(input_path), options)
    doc.save(str(output_path))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert MHT/MHTML to PDF using Aspose.PDF (UV standalone script)")
    parser.add_argument(
        "input",
        nargs="?",
        default=str(Path(__file__).resolve().parent.parent / "input-samples/Why is AI so slow to spread_ Economics can explain.mht"),
        help="Path to input .mht/.mhtml file (default: sample input)",
    )
    parser.add_argument(
        "--out",
        dest="out",
        default=None,
        help="Output PDF path (default: data/uploads/<basename>.aspose.pdf)",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    input_path = Path(args.input).expanduser().resolve()
    if not input_path.exists():
        eprint(f"Input not found: {input_path}")
        return 2

    repo_root = Path(__file__).resolve().parent.parent
    default_out = (repo_root / "data/uploads" / (input_path.stem + ".aspose.pdf"))
    output_path = Path(args.out).expanduser().resolve() if args.out else default_out

    try:
        convert_mht_to_pdf(input_path, output_path)
        size = output_path.stat().st_size if output_path.exists() else 0
        print(f"Aspose PDF written: {output_path} ({size} bytes)")
        return 0
    except Exception as exc:  # pragma: no cover
        eprint("Conversion failed:", exc)
        return 1


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv[1:]))


