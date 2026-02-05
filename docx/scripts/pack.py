#!/usr/bin/env python3
"""
Pack a directory back into a .docx file.

Usage:
    python pack.py <input_directory> <output_docx>

Example:
    python pack.py ./unpacked document-edited.docx
"""

import sys
import zipfile
import os
from pathlib import Path


def pack_docx(input_dir: str, output_path: str) -> None:
    """
    Pack a directory back into a .docx file.
    
    Args:
        input_dir: Directory containing unpacked docx contents
        output_path: Path for the output .docx file
    """
    input_dir = Path(input_dir)
    output_path = Path(output_path)
    
    if not input_dir.exists():
        print(f"Error: Directory not found: {input_dir}")
        sys.exit(1)
    
    if not input_dir.is_dir():
        print(f"Error: Not a directory: {input_dir}")
        sys.exit(1)
    
    # Check for required files
    content_types = input_dir / "[Content_Types].xml"
    if not content_types.exists():
        print(f"Error: Missing [Content_Types].xml - not a valid unpacked docx")
        sys.exit(1)
    
    # Ensure output has .docx extension
    if not output_path.suffix.lower() == '.docx':
        output_path = output_path.with_suffix('.docx')
    
    # Create parent directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Pack into ZIP (docx format)
    file_count = 0
    try:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
            for file_path in input_dir.rglob('*'):
                if file_path.is_file():
                    # Get relative path for archive
                    arcname = file_path.relative_to(input_dir)
                    zip_ref.write(file_path, arcname)
                    file_count += 1
    except Exception as e:
        print(f"Error creating docx: {e}")
        sys.exit(1)
    
    # Get file size
    size_kb = output_path.stat().st_size / 1024
    
    print(f"✓ Packed {input_dir} to {output_path}")
    print(f"  Files included: {file_count}")
    print(f"  Output size: {size_kb:.1f} KB")
    print(f"")
    print(f"  Verify with: pandoc --track-changes=all {output_path} -o verification.md")


def main():
    if len(sys.argv) != 3:
        print("Usage: python pack.py <input_directory> <output_docx>")
        print("Example: python pack.py ./unpacked document-edited.docx")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_path = sys.argv[2]
    
    pack_docx(input_dir, output_path)


if __name__ == "__main__":
    main()
