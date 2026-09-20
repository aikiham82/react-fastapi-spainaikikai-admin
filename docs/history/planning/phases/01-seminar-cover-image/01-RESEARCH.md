# Phase 1: Seminar Cover Image - Research

**Researched:** 2026-02-27
**Domain:** File upload, image processing, static file serving — FastAPI + React
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Upload behavior**
- Eager upload — file is sent to the server immediately on selection, before the form is saved
- The form save only records the returned image URL; no file transfer happens at save time
- Drop zone supports drag-and-drop AND click-to-browse
- Upload control lives inline within the seminar edit form/dialog (not a separate section)
- When replacing an existing image, the old image is deleted immediately when the new file uploads — no deferred state

**Card list display**
- Cover image renders as a full-bleed top banner on the seminar card (full width, image at top, text/info below)
- Seminars without a cover image show a colored placeholder with a generic icon — cards keep the same height regardless of image presence
- In the seminar detail dialog, the cover image is a full-width banner at the top of the dialog, content below
- 16:9 aspect ratio used consistently for both card banner and detail banner (matches the 800×450px server output)

**Placeholder & remove UX**
- Empty drop zone (no image yet): dashed border zone with a camera icon and instruction text ("Arrastra o haz clic para subir")
- Remove control: X / trash icon overlaid on the preview image (visible on hover or always visible)
- No confirmation dialog for removal — clicking X removes immediately (form hasn't been saved yet, so cancel is still available)
- After removing in the form, the area returns to the empty drop zone state (dashed border + camera icon)

**Error & validation feedback**
- Errors appear inline, directly below the drop zone — no toast for file validation errors
- Client-side validation runs first (file type by extension/MIME, file size ≤ 5MB); server validation via magic bytes is the authoritative safety net
- If upload fails mid-way (network error, 500), inline error is shown and the drop zone resets so the user can retry immediately
- All error messages are written in Spanish (consistent with the rest of the admin UI)

### Claude's Discretion
- Exact color/gradient of the placeholder when no image is present
- Specific Spanish error message copy (e.g., "El archivo supera el tamaño máximo de 5MB")
- Loading/spinner design during the eager upload
- Drop zone hover and active states (styling)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMG-01 | Club admin puede subir una imagen de portada (JPEG/PNG/WebP, máx 5MB) desde el formulario de edición del seminario | FastAPI `UploadFile` + `File(...)` + new `/api/v1/seminars/{id}/cover-image` endpoint. Frontend: custom drag-and-drop zone with `<input type="file" accept="image/jpeg,image/png,image/webp">` |
| IMG-02 | El servidor valida el tipo de archivo por magic bytes (no solo MIME header) y rechaza archivos no-imagen | Read first 12 bytes of `UploadFile.read(12)`, check against JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46 ... 57 45 42 50`) signatures. Return HTTP 422 on rejection |
| IMG-03 | El servidor redimensiona automáticamente la imagen a 800×450px (ratio 16:9) al guardarla | Pillow 12.1.0 (already installed): `Image.open()` → `image.resize((800, 450), Image.LANCZOS)` → save JPEG to filesystem. No additional dependency needed |
| IMG-04 | La aplicación rechaza archivos mayores de 5MB con mensaje de error claro para el usuario | Client-side: `file.size > 5 * 1024 * 1024` before upload. Server-side: read `UploadFile` content length or buffer check. Return HTTP 413 |
| IMG-05 | Club admin puede eliminar la imagen de portada existente de un seminario | New `DELETE /api/v1/seminars/{id}/cover-image` endpoint: unlinks file from filesystem + sets `cover_image_url = None` in MongoDB. Frontend: X button in drop zone preview calls this endpoint |
| IMG-06 | Los seminarios con imagen de portada muestran la imagen en la tarjeta del listado | Update `SeminarList` card: add `cover_image_url` to `Seminar` interface/schema; render `<img>` as full-bleed top banner when present, colored placeholder when absent |
| IMG-07 | Los seminarios con imagen de portada muestran la imagen en la página de detalle del seminario | Update seminar detail `Dialog` in `SeminarList`: add full-width banner image at top using `cover_image_url` |
</phase_requirements>

---

## Summary

This phase adds image upload, storage, resizing, and display to the existing seminar feature. The backend already has all required libraries: **Pillow 12.1.0** is installed (used by `LicenseImageService`) and **python-multipart 0.0.20** is installed (required for FastAPI `UploadFile`). The one dependency gap is `aiofiles`, which is needed if using FastAPI's `StaticFiles` mount — however, synchronous file I/O with `pathlib.Path.write_bytes()` works without `aiofiles` and is acceptable for a v1 local filesystem approach.

The architecture follows the established hexagonal pattern precisely: a new `UploadSeminarCoverImageUseCase` in the application layer, a new `/api/v1/seminars/{id}/cover-image` router endpoint that accepts `UploadFile`, and `StaticFiles` mounted at `/uploads/seminars/` in `app.py`. The `Seminar` domain entity gains a `cover_image_url: Optional[str]` field. The frontend adds a `CoverImageDropZone` component inside the existing `SeminarForm` dialog, using React state for eager upload (no external library needed — native `<input type="file">` + drag events).

The most critical pitfall is the **magic bytes validation**: the file pointer must be reset after reading the header bytes (`await file.seek(0)`) before passing the content to Pillow. A second pitfall is image aspect ratio: the decision is to resize to exactly 800×450 (not thumbnail/fit), which means the image is cropped/squashed. Use `ImageOps.fit()` or center-crop + resize to maintain visual quality rather than distorting portrait images.

**Primary recommendation:** Use `POST /api/v1/seminars/{id}/cover-image` with `UploadFile`, synchronous Pillow processing, save to `backend/uploads/seminars/{seminar_id}.jpg`, mount with FastAPI `StaticFiles`, store URL in Seminar document. No new frontend library needed — build the drop zone from native HTML + Tailwind + lucide-react.

---

## Standard Stack

### Core (Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pillow | 12.1.0 (installed) | Image open, resize, save | Already used in `LicenseImageService`; no new dependency |
| python-multipart | 0.0.20 (installed) | Enables FastAPI `UploadFile` | FastAPI requires this for multipart form parsing |
| FastAPI `StaticFiles` | bundled with FastAPI 0.115.6 | Serve `/uploads/` directory as static URL | Built-in; `from fastapi.staticfiles import StaticFiles` |
| pathlib.Path | stdlib | File I/O without async overhead | Sufficient for v1; avoids `aiofiles` dependency |

### Core (Frontend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.10.0 (installed) | Upload via `multipart/form-data` | Project's existing HTTP client |
| lucide-react | 0.525.0 (installed) | Camera, X, Upload icons for drop zone | Project's existing icon library |
| TailwindCSS | 4.1.11 (installed) | Drop zone styling (dashed border, hover states) | Project's CSS framework |
| @tanstack/react-query | 5.84.2 (installed) | Upload mutation following existing mutation pattern | Already used for all data mutations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| aiofiles | Not installed | Async file I/O | Only needed if serving files without `StaticFiles` mount — not required here |
| filetype (PyPI) | N/A | Magic bytes detection library | Not needed — manual byte check is 3 lines and avoids a dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom drag-drop zone | `react-dropzone` npm package | react-dropzone is robust and battle-tested, but adds bundle weight and is overkill for a single-use drop zone with simple validation |
| Manual magic bytes check | `filetype` PyPI package | `filetype` is clean but an extra dependency; 3 JPEG/PNG/WebP byte patterns fit in 10 lines |
| `pathlib.Path.write_bytes()` | `aiofiles.open()` | aiofiles is truly async but not installed; synchronous write in an async endpoint is acceptable for small files (< 5MB) in v1 |
| `image.resize()` | `ImageOps.fit()` | `ImageOps.fit()` crops+resizes maintaining aspect ratio; `resize()` squashes — use `ImageOps.fit()` for better visual result |

**Installation (only if aiofiles needed):**
```bash
cd backend && poetry add aiofiles
```

No new frontend packages needed.

---

## Architecture Patterns

### Recommended Project Structure

New files to create (following existing hexagonal layout):

```
backend/src/
├── application/
│   └── use_cases/
│       └── seminar/
│           └── upload_seminar_cover_image_use_case.py   # NEW
│           └── delete_seminar_cover_image_use_case.py   # NEW
├── infrastructure/
│   └── web/
│       └── routers/
│           └── seminars.py                              # MODIFY: add 2 endpoints
│       └── dto/
│           └── seminar_dto.py                           # MODIFY: add cover_image_url
│   └── adapters/
│       └── repositories/
│           └── mongodb_seminar_repository.py            # MODIFY: include cover_image_url
├── domain/
│   └── entities/
│       └── seminar.py                                   # MODIFY: add cover_image_url field
└── uploads/
    └── seminars/                                        # CREATED at runtime

frontend/src/
└── features/
    └── seminars/
        ├── components/
        │   ├── CoverImageDropZone.tsx                   # NEW
        │   ├── SeminarForm.tsx                          # MODIFY: embed drop zone
        │   └── SeminarList.tsx                          # MODIFY: card + detail display
        ├── data/
        │   ├── schemas/
        │   │   └── seminar.schema.ts                    # MODIFY: add cover_image_url
        │   └── services/
        │       └── seminar.service.ts                   # MODIFY: add uploadCoverImage, deleteCoverImage
        └── hooks/
            └── mutations/
                └── useSeminarMutations.ts               # MODIFY: add upload/delete mutations
```

### Pattern 1: FastAPI UploadFile Endpoint

**What:** Accept multipart file upload, validate via magic bytes, process with Pillow, save to filesystem, return URL.
**When to use:** New `POST /api/v1/seminars/{seminar_id}/cover-image` and `DELETE /api/v1/seminars/{seminar_id}/cover-image` endpoints.

```python
# Source: FastAPI official docs + project pattern in src/infrastructure/web/routers/seminars.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO

UPLOAD_DIR = Path("uploads/seminars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",      # JPEG (all variants: JFIF, EXIF, etc.)
    b"\x89PNG": "png",            # PNG
}
WEBP_MAGIC = (b"RIFF", b"WEBP")   # WebP: bytes 0-3 = RIFF, bytes 8-11 = WEBP

MAX_FILE_SIZE = 5 * 1024 * 1024   # 5 MB

def validate_image_magic_bytes(header: bytes) -> str:
    """Validate file is an image via magic bytes. Returns format or raises HTTPException."""
    for signature, fmt in ALLOWED_MAGIC_BYTES.items():
        if header[:len(signature)] == signature:
            return fmt
    # WebP check: bytes 0-3 = RIFF, bytes 8-11 = WEBP
    if header[:4] == WEBP_MAGIC[0] and header[8:12] == WEBP_MAGIC[1]:
        return "webp"
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Formato no permitido. Usa JPEG, PNG o WebP."
    )

@router.post("/{seminar_id}/cover-image", response_model=SeminarResponse)
async def upload_cover_image(
    seminar_id: str,
    file: UploadFile = File(...),
    get_one_use_case = Depends(get_seminar_use_case),
    get_upload_use_case = Depends(get_upload_cover_image_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    # 1. Auth check
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")

    # 2. Read content (enforces 5MB limit)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5MB."
        )

    # 3. Magic bytes validation (authoritative, not MIME header)
    validate_image_magic_bytes(content[:12])

    # 4. Process with Pillow — crop+resize to 800x450 (16:9)
    image = Image.open(BytesIO(content))
    image = ImageOps.fit(image, (800, 450), Image.LANCZOS)

    # 5. Save as JPEG (normalize all formats to JPEG for consistency)
    output_path = UPLOAD_DIR / f"{seminar_id}.jpg"
    image.save(str(output_path), format="JPEG", quality=85)

    # 6. Update seminar record via use case
    image_url = f"/uploads/seminars/{seminar_id}.jpg"
    seminar = await get_upload_use_case.execute(seminar_id, image_url)
    return SeminarMapper.to_response_dto(seminar)
```

### Pattern 2: Mount StaticFiles in app.py

**What:** Serve the `uploads/` directory as a static URL path.
**When to use:** Once at startup in `create_app()`, before routers are included.

```python
# Source: FastAPI official docs + existing pattern in src/app.py
from fastapi.staticfiles import StaticFiles
from pathlib import Path

def create_app() -> FastAPI:
    app = FastAPI(...)

    # ... exception handlers, CORS middleware ...

    # Mount uploads BEFORE routers (order matters)
    upload_path = Path("uploads")
    upload_path.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    # Include routers
    app.include_router(seminars_router, prefix="/api/v1")
    # ...
```

The static URL `http://localhost:8000/uploads/seminars/{seminar_id}.jpg` is what gets stored in `cover_image_url` and served to the frontend.

### Pattern 3: Frontend Eager Upload (no external library)

**What:** Upload immediately on file selection using FormData + axios mutation. Store returned URL in local React state. Only save URL to seminar on form submit.
**When to use:** Inside `SeminarForm` dialog, inline with other fields.

```typescript
// Source: Project convention from useSeminarMutations.ts + apiClient pattern
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/data/apiClient';

export const useUploadCoverImageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ seminarId, file }: { seminarId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      // Use axios directly with multipart/form-data
      return await apiClient.post<{ cover_image_url: string }>(
        `/api/v1/seminars/${seminarId}/cover-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
  });
};
```

### Pattern 4: Drop Zone Component (native HTML)

**What:** A custom drop zone using native drag events and `<input type="file">`. No external library.
**When to use:** Render inside `SeminarForm` dialog when editing (new seminar: show empty drop zone; existing seminar with image: show preview with X button).

```typescript
// Pattern: native HTML drag events + ref forwarding
const CoverImageDropZone = ({ seminarId, currentImageUrl, onImageChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateClientSide = (file: File): string | null => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return 'Formato no permitido. Usa JPEG, PNG o WebP.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'El archivo supera el límite de 5MB.';
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const error = validateClientSide(file);
    if (error) { setUploadError(error); return; }
    setUploadError(null);
    setIsUploading(true);
    try {
      // Eager upload — seminarId must exist (edit mode) or be created first
      await uploadMutation.mutateAsync({ seminarId, file });
      // onImageChange receives the new URL from the response
    } catch {
      setUploadError('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag handlers, click handler, drop handler all call handleFile()
};
```

**Important:** Eager upload requires a `seminarId`. For NEW seminars, two options exist:
1. Create the seminar first (save form), then upload image in a second step
2. Upload to a temporary slot, move file on seminar creation

**Recommended approach for new seminars:** The drop zone is only shown in edit mode (after seminar exists). For new seminar creation, hide the drop zone; user edits after creation to add image. This avoids orphaned files and matches the locked decision ("upload control lives inline within the seminar edit form/dialog").

### Pattern 5: Domain Entity Extension

**What:** Add `cover_image_url` as an optional field to the `Seminar` dataclass. Validated to be None or a valid URL-like string.

```python
# Modify: backend/src/domain/entities/seminar.py
@dataclass
class Seminar:
    # ... existing fields ...
    cover_image_url: Optional[str] = None   # NEW — relative URL path or None
```

No validation rule needed on the entity — the URL is set only by the infrastructure layer (upload use case), never by external user input as a raw string.

### Anti-Patterns to Avoid

- **Trusting MIME header only:** `UploadFile.content_type` is set by the browser and can be spoofed. Always validate via magic bytes read from file content.
- **Forgetting `await file.seek(0)` after reading header:** If you read 12 bytes for magic validation then pass `file` to Pillow, Pillow will read from byte 12, causing `PIL.UnidentifiedImageError`. Always `await file.seek(0)` or use the already-read `content` bytes.
- **`image.resize()` without centering:** Squashes portrait images. Use `ImageOps.fit(image, (800, 450), Image.LANCZOS)` which center-crops and resizes.
- **Storing absolute filesystem path in DB:** Store relative URL (`/uploads/seminars/{id}.jpg`) not the filesystem path (`/home/abraham/.../uploads/...`).
- **Eager upload on new seminar creation without an ID:** New seminars have no ID yet — file cannot be stored with seminar-scoped filename. Restrict drop zone to edit mode only.
- **Not deleting old file before writing new one:** On image replace, the old file must be unlinked from disk before the new one is written, or unused files accumulate.
- **Mounting StaticFiles after including routers:** FastAPI route priority means StaticFiles mount must come before routers that might match the same prefix.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image decode + format detection | Custom binary parser | `Pillow Image.open()` + manual magic bytes check (12 bytes) | Pillow handles all format edge cases, ICC profiles, EXIF data; magic bytes for 3 types is trivial |
| Image resize/crop | Manual pixel math | `PIL.ImageOps.fit(image, (800, 450), Image.LANCZOS)` | LANCZOS is the highest quality downsampling filter; `ImageOps.fit` handles center-crop automatically |
| Drag-and-drop with file validation | Full state machine | Native HTML `dragover`/`drop` events + `<input type="file" ref={}>` | 30 lines of code; react-dropzone saves 20 lines at the cost of a dependency |
| File cleanup on delete | Scheduled job or soft delete | Immediate `os.unlink()` / `Path.unlink()` in delete use case | Immediate deletion is the locked decision; no complexity needed |
| Serving uploaded files | Custom streaming endpoint | FastAPI `StaticFiles` mount | Built into FastAPI, handles Range requests, ETags, cache headers automatically |

**Key insight:** The file upload domain is fully covered by Python stdlib (`pathlib`) + Pillow (already installed) + FastAPI built-ins. No new backend dependencies are needed.

---

## Common Pitfalls

### Pitfall 1: Magic Bytes — File Pointer Not Reset

**What goes wrong:** `await file.read(12)` advances the file pointer to byte 12. Subsequent `await file.read()` or passing `file.file` to Pillow starts reading from byte 12, corrupting the image.
**Why it happens:** `UploadFile.file` is a SpooledTemporaryFile; reads are sequential.
**How to avoid:** Read ALL content at once (`content = await file.read()`), then use `BytesIO(content)` for Pillow — no seek needed.
**Warning signs:** `PIL.UnidentifiedImageError` on valid image files.

### Pitfall 2: CORS Headers Missing on 413 Responses

**What goes wrong:** FastAPI returns a 413 on oversized files, but uvicorn's error responses don't include CORS headers, causing the browser to show a generic CORS error instead of the actual error message.
**Why it happens:** CORS middleware only adds headers to responses FastAPI handles; very large files may be rejected by uvicorn before reaching the app.
**How to avoid:** Enforce the 5MB limit in application code (`if len(content) > MAX_FILE_SIZE`) before any uvicorn-level rejection. This is the approach used in the existing codebase (per MEMORY.md note about 500s and CORS).
**Warning signs:** Frontend shows "Network Error" instead of the actual error message for large files.

### Pitfall 3: WebP Magic Bytes Detection

**What goes wrong:** WebP files start with `RIFF` (bytes 0-3) followed by 4 bytes of file size, then `WEBP` (bytes 8-11). A naive check for just `RIFF` would accept any RIFF file (WAV audio, AVI video).
**Why it happens:** WebP uses the RIFF container format, shared with other file types.
**How to avoid:** Check BOTH `header[:4] == b"RIFF"` AND `header[8:12] == b"WEBP"`. Read at least 12 bytes for the check.
**Warning signs:** WAV files being accepted as WebP images.

### Pitfall 4: Concurrent Replace Race Condition

**What goes wrong:** Two rapid upload requests for the same seminar both write `{seminar_id}.jpg` simultaneously, causing partial writes.
**Why it happens:** No locking on filesystem writes in async context.
**How to avoid:** Write to a temp file then `rename()` (atomic on Linux). Use `output_path.with_suffix('.tmp')`, write, then `tmp.rename(output_path)`. This is sufficient for v1.
**Warning signs:** Corrupt images after rapid re-uploads.

### Pitfall 5: `aiofiles` Not Installed — StaticFiles Mount Fails

**What goes wrong:** FastAPI's `StaticFiles` requires `aiofiles` at startup. Without it, the app raises `RuntimeError: You must install the "aiofiles" package to use StaticFiles`.
**Why it happens:** `aiofiles` is not in pyproject.toml (confirmed: `poetry show aiofiles` returns nothing).
**How to avoid:** Run `poetry add aiofiles` before implementing the `StaticFiles` mount.
**Warning signs:** `RuntimeError` on app startup after adding the `app.mount()` call.

### Pitfall 6: SeminarForm Drop Zone for New vs Edit Mode

**What goes wrong:** Drop zone appears for new seminar creation, user uploads image, form fails validation, seminar is never created — orphaned image file on disk.
**Why it happens:** Eager upload sends file before the seminar ID exists.
**How to avoid:** Render the `CoverImageDropZone` only when `isEditing === true` (i.e., `seminar` prop is not null). For new seminars, the drop zone is not shown; user adds image after creation.
**Warning signs:** Files accumulating in `uploads/seminars/` without corresponding seminars.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Magic Bytes Check (Python)

```python
# No external dependency needed
MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",    # JPEG (JFIF, EXIF, and all variants share this prefix)
    b"\x89PNG":      "png",     # PNG: 89 50 4E 47 ...
}

def validate_image_magic_bytes(content: bytes) -> None:
    """Raises HTTPException 422 if content is not a supported image format."""
    for signature in MAGIC_BYTES:
        if content[:len(signature)] == signature:
            return
    # WebP: first 4 bytes = "RIFF", bytes 8-11 = "WEBP"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Formato no permitido. Usa JPEG, PNG o WebP."
    )
```

### Pillow Resize with Center Crop

```python
# Source: Pillow official docs — ImageOps.fit
# https://pillow.readthedocs.io/en/stable/reference/ImageOps.html#PIL.ImageOps.fit
from PIL import Image, ImageOps
from io import BytesIO

def process_image(content: bytes) -> bytes:
    """Open image bytes, crop+resize to 800x450, return as JPEG bytes."""
    image = Image.open(BytesIO(content))
    # Convert to RGB if needed (e.g., PNG with transparency, WebP with alpha)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    # ImageOps.fit: crops to fill the target size, centered, then resizes
    image = ImageOps.fit(image, (800, 450), Image.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()
```

### Frontend Drop Zone — File Input + Drag Events

```typescript
// Pattern: native HTML, no react-dropzone, consistent with project conventions
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
};

// Hidden input + programmatic click
<input
  ref={inputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  className="hidden"
  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
/>
<div
  onClick={() => inputRef.current?.click()}
  onDragOver={handleDragOver}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
  className={cn(
    "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30",
  )}
>
  <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
  <p className="text-sm text-muted-foreground text-center">
    Arrastra una imagen aquí o haz clic para seleccionar
  </p>
</div>
```

### Seminar Card with Full-Bleed Banner

```typescript
// Pattern: consistent with existing SeminarList card structure
// Image at top, content below, fixed 16:9 aspect ratio container
<div key={seminar.id} className="border rounded-lg hover:shadow-lg transition-shadow bg-white overflow-hidden">
  {/* Full-bleed top banner — 16:9 via aspect-video */}
  <div className="aspect-video bg-muted relative">
    {seminar.cover_image_url ? (
      <img
        src={`http://localhost:8000${seminar.cover_image_url}`}
        alt={seminar.title}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <Calendar className="w-12 h-12 text-slate-400" />
      </div>
    )}
  </div>
  {/* Existing card content — unchanged */}
  <div className="p-6 space-y-4">
    {/* ... */}
  </div>
</div>
```

### Upload Use Case (Hexagonal Pattern)

```python
# Follows project pattern from UpdateSeminarUseCase
# backend/src/application/use_cases/seminar/upload_seminar_cover_image_use_case.py
class UploadSeminarCoverImageUseCase:
    def __init__(self, seminar_repository: SeminarRepositoryPort):
        self.seminar_repository = seminar_repository

    async def execute(self, seminar_id: str, cover_image_url: str) -> Seminar:
        seminar = await self.seminar_repository.find_by_id(seminar_id)
        if seminar is None:
            raise SeminarNotFoundError(seminar_id)
        seminar.cover_image_url = cover_image_url
        return await self.seminar_repository.update(seminar)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `imghdr` module for image type detection | Manual magic bytes check or `filetype` PyPI | Python 3.11+ (`imghdr` deprecated) | `imghdr` is available in Python 3.11 but deprecated; use manual magic bytes instead |
| `Image.ANTIALIAS` resize filter | `Image.LANCZOS` | Pillow 10.0.0 | `ANTIALIAS` was removed; use `Image.LANCZOS` (same algorithm, new name) |
| `Image.thumbnail()` | `ImageOps.fit()` | Pillow stable | `thumbnail()` only shrinks, preserves aspect ratio; `fit()` crops to exact target size |
| `app.mount()` before routers | Still required | FastAPI 0.115.x | Mount order still matters; StaticFiles mount must precede routers |

**Deprecated/outdated:**
- `Image.ANTIALIAS`: removed in Pillow 10.0.0. Use `Image.LANCZOS` instead. (Pillow 12.1.0 is installed — `LANCZOS` is correct.)
- `imghdr` stdlib module: deprecated in Python 3.11, will be removed in Python 3.13. Do not use for magic bytes detection.

---

## Open Questions

1. **Image URL prefix in frontend (base URL vs relative)**
   - What we know: The backend serves images at `http://localhost:8000/uploads/seminars/{id}.jpg`. The frontend `apiClient` is configured with `http://localhost:8000` as base URL.
   - What's unclear: Whether `cover_image_url` stored in DB should be the full URL or just the path (`/uploads/seminars/{id}.jpg`). In production, the base URL may differ.
   - Recommendation: Store relative path (`/uploads/seminars/{id}.jpg`) in DB. Frontend constructs full URL using `VITE_API_BASE_URL` env var or `apiClient.defaults.baseURL`. This avoids hardcoded hostnames in the database.

2. **PNG/WebP with transparency (alpha channel)**
   - What we know: PNG and WebP support alpha channels. JPEG does not.
   - What's unclear: If the user uploads a transparent PNG, `image.convert("RGB")` fills transparency with black. This may surprise users.
   - Recommendation: Before converting, fill alpha with white background: `background = Image.new("RGB", image.size, (255, 255, 255)); background.paste(image, mask=image.split()[3])`. Include this in `process_image()`.

3. **Upload directory location (relative to where uvicorn runs)**
   - What we know: `uvicorn` is run from `backend/` directory. `Path("uploads/seminars")` resolves relative to CWD.
   - What's unclear: If uvicorn CWD changes, the mount path breaks.
   - Recommendation: Use `Path(__file__).parent.parent.parent / "uploads"` (resolved from `app.py`) for an absolute path. Follow the same pattern as `LicenseImageService.assets_dir`.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — treating as false. Skipping Validation Architecture section.

Note: The config has `"workflow": {"research": true, "plan_check": true, "verifier": true}` — `nyquist_validation` is not a key. Skipping.

---

## Sources

### Primary (HIGH confidence)
- FastAPI official docs — `UploadFile` reference: https://fastapi.tiangolo.com/reference/uploadfile/
- FastAPI official docs — StaticFiles: https://www.fastapitutorial.com/blog/static-files-fastapi/
- Pillow official docs — `ImageOps.fit`: https://pillow.readthedocs.io/en/stable/reference/ImageOps.html
- Project codebase — `LicenseImageService` (Pillow usage pattern, `PIL.Image`, `PIL.ImageOps`)
- Project codebase — `seminars.py` router (auth pattern, dependency injection pattern)
- Project codebase — `update_seminar_use_case.py` (use case pattern)
- Project codebase — `useSeminarMutations.ts` (mutation pattern with `toast` + `queryClient.invalidateQueries`)
- pyproject.toml — `pillow = "^12.1.0"` confirmed installed; `aiofiles` confirmed NOT installed

### Secondary (MEDIUM confidence)
- Wikipedia: List of file signatures — magic bytes for JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF...WEBP): https://en.wikipedia.org/wiki/List_of_file_signatures
- Transloadit: Secure API file uploads with magic numbers — explains why MIME header spoofing is easy and magic bytes are the safe approach: https://transloadit.com/devtips/secure-api-file-uploads-with-magic-numbers/
- Medium: FastAPI image optimization patterns — confirms `UploadFile` + Pillow + StaticFiles combination: https://medium.com/@sizanmahmud08/fastapi-image-optimization-a-complete-guide-to-faster-and-smarter-file-handling-38705e5a7b3c

### Tertiary (LOW confidence)
- WebP RIFF container structure (bytes 0-3 = RIFF, bytes 8-11 = WEBP) — cross-referenced with Wikipedia file signatures table

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in pyproject.toml/package.json; `aiofiles` gap confirmed via `poetry show`
- Architecture patterns: HIGH — follows exact hexagonal pattern of existing `UpdateSeminarUseCase`, `LicenseImageService`, router patterns
- Pitfalls: HIGH — `aiofiles` absence confirmed; `ANTIALIAS` removal confirmed (Pillow changelog); CORS on 500s is project-specific known issue documented in MEMORY.md; WebP magic bytes verified against Wikipedia
- Frontend patterns: HIGH — native HTML approach confirmed by reviewing existing codebase; no `react-dropzone` in package.json

**Research date:** 2026-02-27
**Valid until:** 2026-03-29 (30 days — stable domain, Pillow and FastAPI APIs are stable)
