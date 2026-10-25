# 🎯 Excel import cells are read as text

## 💡 Convention

Every text field read from an imported Excel row goes through `_cell_text` before it reaches a use case. SheetJS sends a number cell as a JSON number, and the response DTOs type those fields as `str`. One number stored in MongoDB makes every list that contains that document answer 500.

## 🏆 Benefits

- 2026-10-23: a Shoshin Dojo import stored the postal code `23001` as an int. Pydantic raised `string_type` on `MemberResponse`, and the members page failed for every super admin and for that club.
- A Spanish postal code typed as a number loses its leading zero (`08001` → `8001`). `_postal_code_text` restores it, but only for four digits and only when the country is Spain.

## 👀 Examples

### ✅ Good: the cell becomes text before it is stored

```python
dni = _cell_text(row.get('dni') or row.get('DNI'))
postal_code = _postal_code_text(row.get('postal_code') or row.get('Código Postal'), country)
```

### ❌ Bad: the raw cell is passed through

```python
postal_code = row.get('postal_code') or row.get('Código Postal') or ''
```

## 🧐 Real world examples

- [`import_members`](../../backend/src/infrastructure/web/routers/import_export.py)
- [`test_members_import_text_cells.py`](../../backend/tests/api/test_members_import_text_cells.py)
- The licence, insurance and payment imports still read `dni`, `license_number` and `policy_number` raw (pending).

## 🔗 Related agreements

- [`../domain/data-model.md`](../domain/data-model.md)
- [`backend.md`](backend.md)
