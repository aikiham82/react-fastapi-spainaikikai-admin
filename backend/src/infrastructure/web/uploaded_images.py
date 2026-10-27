"""Image uploads: validated by content, re-encoded as JPEG and saved under backend/uploads/."""

from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps

UPLOADS_ROOT = Path(__file__).parent.parent.parent.parent / "uploads"
MAX_IMAGE_SIZE = 5 * 1024 * 1024

MAGIC_BYTES = (b"\xff\xd8\xff", b"\x89PNG")


def validate_image_magic_bytes(content: bytes) -> None:
    """Validate image format using magic bytes (not file extension)."""
    if content.startswith(MAGIC_BYTES):
        return
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Formato no permitido. Usa JPEG, PNG o WebP."
    )


async def read_image_upload(file: UploadFile) -> bytes:
    """Read an uploaded image, refusing files that are too large or not an image."""
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5MB."
        )
    validate_image_magic_bytes(content)
    return content


def to_jpeg(content: bytes, size: tuple[int, int]) -> bytes:
    """Crop to the target aspect ratio and resize to a JPEG of exactly that size."""
    image = Image.open(BytesIO(content))
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = ImageOps.fit(image, size, Image.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def save_atomically(directory: Path, filename: str, content: bytes) -> None:
    """Write through a temporary file so a reader never sees a half-written image."""
    directory.mkdir(parents=True, exist_ok=True)
    tmp_path = directory / f"{filename}.tmp"
    tmp_path.write_bytes(content)
    tmp_path.rename(directory / filename)
