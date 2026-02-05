# OOXML Reference

Guide for editing Word documents using Python and direct XML manipulation.

## Document Library

The Document library provides a Python interface for OOXML manipulation.

### Basic Usage

```python
from pathlib import Path
import defusedxml.ElementTree as ET

# Load unpacked document
doc_path = Path("unpacked/word/document.xml")
tree = ET.parse(doc_path)
root = tree.getroot()

# Define namespaces
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

# Find elements
for para in root.findall('.//w:p', NAMESPACES):
    for run in para.findall('.//w:r', NAMESPACES):
        text = run.find('.//w:t', NAMESPACES)
        if text is not None:
            print(text.text)

# Save changes
tree.write(doc_path, xml_declaration=True, encoding='UTF-8')
```

### Finding Text

```python
def find_text_in_document(root, search_text):
    """Find paragraphs containing specific text."""
    results = []
    for para in root.findall('.//w:p', NAMESPACES):
        para_text = ''.join(
            t.text or '' 
            for t in para.findall('.//w:t', NAMESPACES)
        )
        if search_text in para_text:
            results.append(para)
    return results
```

### Replacing Text

```python
def replace_text(root, old_text, new_text):
    """Replace text throughout the document."""
    for text_elem in root.findall('.//w:t', NAMESPACES):
        if text_elem.text and old_text in text_elem.text:
            text_elem.text = text_elem.text.replace(old_text, new_text)
```

## Tracked Change Patterns

### Insertion (w:ins)

```xml
<w:ins w:id="1" w:author="Author Name" w:date="2024-01-15T10:30:00Z">
  <w:r>
    <w:t>Inserted text</w:t>
  </w:r>
</w:ins>
```

### Deletion (w:del)

```xml
<w:del w:id="2" w:author="Author Name" w:date="2024-01-15T10:30:00Z">
  <w:r>
    <w:delText>Deleted text</w:delText>
  </w:r>
</w:del>
```

### Creating Tracked Changes in Python

```python
from datetime import datetime
import defusedxml.ElementTree as ET

def create_insertion(text, author="Claude", rsid="00AB12CD"):
    """Create an insertion element."""
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    
    ins = ET.Element(f'{ns}ins')
    ins.set(f'{ns}id', str(get_next_id()))
    ins.set(f'{ns}author', author)
    ins.set(f'{ns}date', datetime.utcnow().isoformat() + 'Z')
    
    run = ET.SubElement(ins, f'{ns}r')
    run.set(f'{ns}rsidR', rsid)
    
    text_elem = ET.SubElement(run, f'{ns}t')
    text_elem.text = text
    
    return ins

def create_deletion(text, author="Claude", rsid="00AB12CD"):
    """Create a deletion element."""
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    
    del_elem = ET.Element(f'{ns}del')
    del_elem.set(f'{ns}id', str(get_next_id()))
    del_elem.set(f'{ns}author', author)
    del_elem.set(f'{ns}date', datetime.utcnow().isoformat() + 'Z')
    
    run = ET.SubElement(del_elem, f'{ns}r')
    run.set(f'{ns}rsidR', rsid)
    
    del_text = ET.SubElement(run, f'{ns}delText')
    del_text.text = text
    
    return del_elem
```

## OOXML Document Structure

### Key Files in .docx

```
document.docx (ZIP archive)
├── [Content_Types].xml      # MIME types
├── _rels/
│   └── .rels               # Package relationships
├── word/
│   ├── document.xml        # Main content
│   ├── styles.xml          # Style definitions
│   ├── settings.xml        # Document settings
│   ├── fontTable.xml       # Font information
│   ├── comments.xml        # Comments (if any)
│   ├── numbering.xml       # List definitions
│   ├── _rels/
│   │   └── document.xml.rels
│   └── media/              # Embedded images
└── docProps/
    ├── core.xml            # Metadata
    └── app.xml             # Application info
```

### Paragraph Structure (w:p)

```xml
<w:p w:rsidR="00AB12CD" w:rsidRDefault="00AB12CD">
  <w:pPr>                    <!-- Paragraph properties -->
    <w:jc w:val="center"/>   <!-- Justification -->
    <w:pStyle w:val="Heading1"/>
  </w:pPr>
  <w:r w:rsidR="00AB12CD">   <!-- Run (text container) -->
    <w:rPr>                  <!-- Run properties -->
      <w:b/>                 <!-- Bold -->
      <w:i/>                 <!-- Italic -->
      <w:sz w:val="24"/>     <!-- Font size (half-points) -->
    </w:rPr>
    <w:t>Text content</w:t>  <!-- Actual text -->
  </w:r>
</w:p>
```

### Common Elements

| Element | Purpose |
|---------|---------|
| `w:p` | Paragraph |
| `w:r` | Run (text container) |
| `w:t` | Text content |
| `w:pPr` | Paragraph properties |
| `w:rPr` | Run properties |
| `w:b` | Bold |
| `w:i` | Italic |
| `w:u` | Underline |
| `w:sz` | Font size |
| `w:color` | Text color |
| `w:jc` | Justification |
| `w:ins` | Insertion (tracked change) |
| `w:del` | Deletion (tracked change) |
| `w:delText` | Deleted text content |

## Comments

### Comment Structure

```xml
<!-- In word/comments.xml -->
<w:comment w:id="0" w:author="Author" w:date="2024-01-15T10:00:00Z">
  <w:p>
    <w:r>
      <w:t>Comment text here</w:t>
    </w:r>
  </w:p>
</w:comment>

<!-- In word/document.xml (where comment is anchored) -->
<w:commentRangeStart w:id="0"/>
<w:r><w:t>Commented text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r>
  <w:commentReference w:id="0"/>
</w:r>
```

### Adding a Comment in Python

```python
def add_comment(doc_root, comments_root, text, comment_text, author="Claude"):
    """Add a comment to specific text."""
    comment_id = get_next_comment_id(comments_root)
    
    # Create comment in comments.xml
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    comment = ET.SubElement(comments_root, f'{ns}comment')
    comment.set(f'{ns}id', str(comment_id))
    comment.set(f'{ns}author', author)
    comment.set(f'{ns}date', datetime.utcnow().isoformat() + 'Z')
    
    para = ET.SubElement(comment, f'{ns}p')
    run = ET.SubElement(para, f'{ns}r')
    t = ET.SubElement(run, f'{ns}t')
    t.text = comment_text
    
    # Add comment markers in document.xml
    # (Implementation depends on where you want to anchor it)
```

## RSID (Revision Save ID)

RSIDs track which editing session made changes. When editing:

1. Get the suggested RSID from unpack.py output
2. Use it for all your changes
3. This helps Word track revisions properly

```python
# Use consistent RSID for your session
MY_RSID = "00AB12CD"

run.set(f'{ns}rsidR', MY_RSID)
```

## Best Practices

1. **Always use defusedxml** - Prevents XML attacks
2. **Preserve RSIDs** - Maintain document revision history
3. **Test incrementally** - Pack and verify after each batch of changes
4. **Keep minimal edits** - Only change what's necessary
5. **Backup original** - Always keep the original document
6. **Use namespaces** - Always include proper XML namespaces

## Common Patterns

### Find and Replace with Tracked Changes

```python
def tracked_replace(root, old_text, new_text, author="Claude", rsid="00AB12CD"):
    """Replace text with tracked changes."""
    for text_elem in root.findall('.//w:t', NAMESPACES):
        if text_elem.text and old_text in text_elem.text:
            parent_run = text_elem.getparent()
            parent_para = parent_run.getparent()
            
            # Find position of run in paragraph
            run_index = list(parent_para).index(parent_run)
            
            # Create deletion
            del_elem = create_deletion(old_text, author, rsid)
            
            # Create insertion
            ins_elem = create_insertion(new_text, author, rsid)
            
            # Insert after original run
            parent_para.insert(run_index + 1, del_elem)
            parent_para.insert(run_index + 2, ins_elem)
            
            # Remove original run
            parent_para.remove(parent_run)
```

### Grep Before Editing

Always grep for your target text before writing scripts:

```bash
grep -n "target text" word/document.xml
```

This confirms:
- Text exists in document
- How it's split across runs
- Line numbers for reference
