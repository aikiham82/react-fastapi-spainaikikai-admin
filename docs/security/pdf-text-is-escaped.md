# 🎯 Text placed in a PDF is escaped first

## 💡 Convention

Every value that reaches a ReportLab `Paragraph` from data (customer, member, club, company, notes, numbers) goes through `xml.sax.saxutils.escape` before it is interpolated into the markup. Only the template's own tags (`<b>`, `<br/>`) stay unescaped.

## 🏆 Benefits

- `Paragraph` parses its text as markup. An unescaped payer name such as `<img src="http://..."/>` makes the server fetch that URL or read a local file, and a stray `<` raises and turns the download into a 500.
- A club admin controls `payer_name`, which becomes the invoice's `customer_name`, so the input is not trusted.

## 👀 Examples

### ✅ Good

```python
from xml.sax.saxutils import escape

customer_info = f"<b>Datos del cliente:</b><br/>{escape(invoice.customer_name or 'N/A')}"
```

### ❌ Bad

```python
customer_info = f"<b>Datos del cliente:</b><br/>{invoice.customer_name}"
```

## 🧐 Real world examples

- [`backend/src/infrastructure/adapters/services/pdf_service.py`](../../backend/src/infrastructure/adapters/services/pdf_service.py)
- [`backend/tests/infrastructure/adapters/services/test_pdf_service.py`](../../backend/tests/infrastructure/adapters/services/test_pdf_service.py): renders markup-laden text and fails if ReportLab tries to load an image.

## 🔗 Related agreements

- [`security-guidelines.md`](security-guidelines.md)
