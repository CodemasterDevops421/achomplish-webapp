# docx-js Reference

Complete guide for creating Word documents with the docx npm package.

## Installation

```bash
npm install docx
```

## Basic Document Structure

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const fs = require("fs");

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: "Hello World",
        heading: HeadingLevel.HEADING_1,
      }),
    ],
  }],
});

// Save to file
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("output.docx", buffer);
});
```

## Document Configuration

```javascript
const doc = new Document({
  creator: "Author Name",
  title: "Document Title",
  description: "Document Description",
  sections: [/* ... */],
});
```

## Paragraphs

### Basic Paragraph
```javascript
new Paragraph({
  text: "Simple text paragraph",
})
```

### Paragraph with Formatting
```javascript
new Paragraph({
  children: [
    new TextRun({
      text: "Bold text",
      bold: true,
    }),
    new TextRun({
      text: " and ",
    }),
    new TextRun({
      text: "italic text",
      italics: true,
    }),
  ],
})
```

### Headings
```javascript
new Paragraph({
  text: "Heading 1",
  heading: HeadingLevel.HEADING_1,
})

new Paragraph({
  text: "Heading 2", 
  heading: HeadingLevel.HEADING_2,
})
```

### Alignment
```javascript
const { AlignmentType } = require("docx");

new Paragraph({
  text: "Centered text",
  alignment: AlignmentType.CENTER,
})
// Options: LEFT, CENTER, RIGHT, JUSTIFIED
```

## TextRun Formatting

```javascript
new TextRun({
  text: "Formatted text",
  bold: true,
  italics: true,
  underline: {},
  strike: true,
  size: 28,  // Half-points (28 = 14pt)
  font: "Arial",
  color: "FF0000",  // Red
  highlight: "yellow",
  allCaps: true,
  smallCaps: true,
  superScript: true,
  subScript: true,
})
```

## Lists

### Bullet List
```javascript
const { Document, Paragraph, TextRun } = require("docx");

new Paragraph({
  text: "First bullet point",
  bullet: { level: 0 },
})

new Paragraph({
  text: "Nested bullet",
  bullet: { level: 1 },
})
```

### Numbered List
```javascript
new Paragraph({
  text: "First item",
  numbering: { reference: "my-numbering", level: 0 },
})
```

## Tables

```javascript
const { Table, TableRow, TableCell, WidthType } = require("docx");

new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph("Cell 1")],
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph("Cell 2")],
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ],
})
```

### Table with Headers
```javascript
new Table({
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ text: "Header 1", bold: true })],
          shading: { fill: "CCCCCC" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Header 2", bold: true })],
          shading: { fill: "CCCCCC" },
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Data 1")] }),
        new TableCell({ children: [new Paragraph("Data 2")] }),
      ],
    }),
  ],
})
```

## Images

```javascript
const { ImageRun } = require("docx");
const fs = require("fs");

new Paragraph({
  children: [
    new ImageRun({
      data: fs.readFileSync("image.png"),
      transformation: {
        width: 200,
        height: 150,
      },
    }),
  ],
})
```

## Page Breaks

```javascript
const { PageBreak } = require("docx");

new Paragraph({
  children: [new PageBreak()],
})
```

## Headers and Footers

```javascript
const { Header, Footer, PageNumber } = require("docx");

const doc = new Document({
  sections: [{
    headers: {
      default: new Header({
        children: [new Paragraph("Header text")],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun("Page "),
              new TextRun({ children: [PageNumber.CURRENT] }),
              new TextRun(" of "),
              new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
            ],
          }),
        ],
      }),
    },
    children: [/* ... */],
  }],
});
```

## Page Setup

```javascript
const { PageOrientation } = require("docx");

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: {
          orientation: PageOrientation.LANDSCAPE,
          width: 12240,  // twips (1 inch = 1440 twips)
          height: 15840,
        },
        margin: {
          top: 1440,     // 1 inch
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
      },
    },
    children: [/* ... */],
  }],
});
```

## Hyperlinks

```javascript
const { ExternalHyperlink } = require("docx");

new Paragraph({
  children: [
    new ExternalHyperlink({
      children: [
        new TextRun({
          text: "Click here",
          style: "Hyperlink",
        }),
      ],
      link: "https://example.com",
    }),
  ],
})
```

## Complete Example

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType } = require("docx");
const fs = require("fs");

const doc = new Document({
  creator: "PDF API",
  title: "Sample Document",
  sections: [{
    children: [
      // Title
      new Paragraph({
        text: "Document Title",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      
      // Subtitle
      new Paragraph({
        children: [
          new TextRun({
            text: "Created with docx-js",
            italics: true,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      
      // Body paragraph
      new Paragraph({
        children: [
          new TextRun("This is a "),
          new TextRun({ text: "bold", bold: true }),
          new TextRun(" and "),
          new TextRun({ text: "italic", italics: true }),
          new TextRun(" text example."),
        ],
      }),
      
      // Bullet list
      new Paragraph({ text: "First point", bullet: { level: 0 } }),
      new Paragraph({ text: "Second point", bullet: { level: 0 } }),
      new Paragraph({ text: "Nested point", bullet: { level: 1 } }),
      
      // Simple table
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Name")] }),
              new TableCell({ children: [new Paragraph("Value")] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph("Item 1")] }),
              new TableCell({ children: [new Paragraph("100")] }),
            ],
          }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("output.docx", buffer);
  console.log("Document created successfully!");
});
```

## Best Practices

1. **Always use TextRun for formatted text** - Don't mix `text` property with `children`
2. **Use HeadingLevel for semantic headings** - Better for accessibility and TOC
3. **Size is in half-points** - 24 = 12pt font
4. **Colors are hex without #** - Use "FF0000" not "#FF0000"
5. **Width in tables** - Use WidthType.PERCENTAGE for responsive tables
