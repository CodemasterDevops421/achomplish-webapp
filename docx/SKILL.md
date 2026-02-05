---
name: docx
description: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"
---

# DOCX creation, editing, and analysis

## Overview

A user may ask you to create, edit, or analyze the contents of a .docx file. A .docx file is essentially a ZIP archive containing XML files and other resources that you can read or edit. You have different tools and workflows available for different tasks.

## Workflow Decision Tree

### Reading/Analyzing Content
Use "Text extraction" or "Raw XML access" sections below

### Creating New Document
Use "Creating a new Word document" workflow

### Editing Existing Document
- **Your own document + simple changes**
  Use "Basic OOXML editing" workflow

- **Someone else's document**
  Use **"Redlining workflow"** (recommended default)

- **Legal, academic, business, or government docs**
  Use **"Redlining workflow"** (required)

## Reading and analyzing content

### Text extraction
If you just need to read the text contents of a document, you should convert the document to markdown using pandoc. Pandoc provides excellent support for preserving document structure and can show tracked changes:

```bash
# Convert document to markdown with tracked changes
pandoc --track-changes=all path-to-file.docx -o output.md
# Options: --track-changes=accept/reject/all
```

### Raw XML access
You need raw XML access for: comments, complex formatting, document structure, embedded media, and metadata. For any of these features, you'll need to unpack a document and read its raw XML contents.

#### Unpacking a file
`python skills/docx/scripts/unpack.py <office_file> <output_directory>`

#### Key file structures
* `word/document.xml` - Main document contents
* `word/comments.xml` - Comments referenced in document.xml
* `word/media/` - Embedded images and media files
* Tracked changes use `<w:ins>` (insertions) and `<w:del>` (deletions) tags

## Creating a new Word document

When creating a new Word document from scratch, use **docx-js**, which allows you to create Word documents using JavaScript/TypeScript.

### Workflow
1. **MANDATORY - READ ENTIRE FILE**: Read [`references/docx-js.md`](references/docx-js.md) completely for detailed syntax, critical formatting rules, and best practices before proceeding with document creation.
2. Create a JavaScript/TypeScript file using Document, Paragraph, TextRun components
3. Export as .docx using Packer.toBuffer()

## Editing an existing Word document

When editing an existing Word document, use the **Document library** (a Python library for OOXML manipulation). The library automatically handles infrastructure setup and provides methods for document manipulation.

### Workflow
1. **MANDATORY - READ ENTIRE FILE**: Read [`references/ooxml.md`](references/ooxml.md) completely for the Document library API and XML patterns.
2. Unpack the document: `python skills/docx/scripts/unpack.py <office_file> <output_directory>`
3. Create and run a Python script using the Document library
4. Pack the final document: `python skills/docx/scripts/pack.py <input_directory> <office_file>`

## Redlining workflow for document review

This workflow allows you to plan comprehensive tracked changes using markdown before implementing them in OOXML.

**Batching Strategy**: Group related changes into batches of 3-10 changes. Test each batch before moving to the next.

**Principle: Minimal, Precise Edits**
When implementing tracked changes, only mark text that actually changes.

### Tracked changes workflow

1. **Get markdown representation**:
   ```bash
   pandoc --track-changes=all path-to-file.docx -o current.md
   ```

2. **Identify and group changes**: Review and organize into logical batches

3. **Read documentation and unpack**:
   - Read [`references/ooxml.md`](references/ooxml.md) completely
   - Unpack: `python skills/docx/scripts/unpack.py <file.docx> <dir>`

4. **Implement changes in batches**: Use Document library for each batch

5. **Pack the document**:
   ```bash
   python skills/docx/scripts/pack.py unpacked reviewed-document.docx
   ```

6. **Final verification**: Convert and verify all changes applied correctly

## Converting Documents to Images

```bash
# Convert DOCX to PDF
soffice --headless --convert-to pdf document.docx

# Convert PDF pages to JPEG
pdftoppm -jpeg -r 150 document.pdf page
```

## Dependencies

- **pandoc**: `sudo apt-get install pandoc`
- **docx**: `npm install -g docx`
- **LibreOffice**: `sudo apt-get install libreoffice`
- **Poppler**: `sudo apt-get install poppler-utils`
- **defusedxml**: `pip install defusedxml`
