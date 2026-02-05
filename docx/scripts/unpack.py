#!/usr/bin/env python3
"""
Unpack a .docx file to a directory for editing.

Usage:
    python unpack.py <docx_file> <output_directory>

Example:
    python unpack.py document.docx ./unpacked
"""

import sys
import zipfile
import os
import random
import string
from pathlib import Path


def generate_rsid():
    """Generate a random RSID for tracked changes."""
    return ''.join(random.choices(string.hexdigits.upper()[:16], k=8))


def unpack_docx(docx_path: str, output_dir: str) -> None:
    """
    Unpack a .docx file to a directory.
    
    Args:
        docx_path: Path to the .docx file
        output_dir: Directory to extract contents to
    """
    docx_path = Path(docx_path)
    output_dir = Path(output_dir)
    
    if not docx_path.exists():
        print(f"Error: File not found: {docx_path}")
        sys.exit(1)
    
    if not docx_path.suffix.lower() == '.docx':
        print(f"Warning: File does not have .docx extension: {docx_path}")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract the docx (which is a ZIP file)
    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
    except zipfile.BadZipFile:
        print(f"Error: Invalid or corrupted .docx file: {docx_path}")
        sys.exit(1)
    
    # Count extracted files
    file_count = sum(1 for _ in output_dir.rglob('*') if _.is_file())
    
    # Generate suggested RSID for tracked changes
    rsid = generate_rsid()
    
    print(f"✓ Unpacked {docx_path.name} to {output_dir}")
    print(f"  Files extracted: {file_count}")
    print(f"  Main content: {output_dir}/word/document.xml")
    print(f"")
    print(f"  Suggested RSID for tracked changes: {rsid}")
    print(f"  Use this RSID in your editing scripts for consistent revision tracking.")


def main():
    if len(sys.argv) != 3:
        print("Usage: python unpack.py <docx_file> <output_directory>")
        print("Example: python unpack.py document.docx ./unpacked")
        sys.exit(1)
    
    docx_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    unpack_docx(docx_path, output_dir)


if __name__ == "__main__":
    main()
