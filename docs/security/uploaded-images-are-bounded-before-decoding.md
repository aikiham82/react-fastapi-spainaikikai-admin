# 🎯 Uploaded images are bounded before decoding

## 💡 Convention

Every image upload goes through [`uploaded_images.py`](../../backend/src/infrastructure/web/uploaded_images.py). It reads at most 5 MB, checks the magic bytes, refuses images over 25 million pixels **before** decoding them, and re-encodes them as a JPEG inside `run_in_threadpool`. A router never calls Pillow directly. Anything written under `backend/uploads/` is served publicly without login, so only images that are public on purpose go there.

## 🏆 Benefits

- The file size says nothing about the decoded size. On 2026-10-27 a 328 KB PNG of 13000 × 13000 px passed the 5 MB cap and used 1.5 GB of RAM to decode. Pillow only raises `DecompressionBombError` above about 179M px; below that it just warns.
- Decoding runs in the threadpool, so one big upload does not freeze every other request.
- Re-encoding removes EXIF and GPS metadata, and it destroys polyglot files (an HTML or PDF disguised as a PNG).
- Logos and seminar covers share one tested path instead of two copies that drift apart.

## 👀 Examples

### ✅ Good: the shared helpers, off the event loop

```python
content = await read_image_upload(file)
jpeg = await run_in_threadpool(to_jpeg, content, (256, 256), pad=True)
save_atomically(CLUB_LOGO_DIR, f"{club_id}.jpg", jpeg)
```

### ❌ Bad: Pillow in the handler, sized only by bytes

```python
content = await file.read()
if len(content) > 5 * 1024 * 1024:
    raise HTTPException(413)
image = Image.open(BytesIO(content)).convert("RGB")
```

### ❌ Bad: a private file under uploads

```python
save_atomically(UPLOADS_ROOT / "invoices", f"{invoice_id}.pdf", pdf)
```

Anyone with the URL can download it.

## 🧐 Real world examples

- [`backend/src/infrastructure/web/uploaded_images.py`](../../backend/src/infrastructure/web/uploaded_images.py)
- [`backend/src/infrastructure/web/routers/clubs.py`](../../backend/src/infrastructure/web/routers/clubs.py) (`upload_club_logo`)
- [`backend/src/infrastructure/web/routers/seminars.py`](../../backend/src/infrastructure/web/routers/seminars.py) (`upload_cover_image`)
- [`backend/tests/infrastructure/web/test_club_logo_router.py`](../../backend/tests/infrastructure/web/test_club_logo_router.py)

## 🔗 Related agreements

- [Security guidelines](security-guidelines.md)
- [Public images are unignored](../conventions/public-images-are-unignored.md)
