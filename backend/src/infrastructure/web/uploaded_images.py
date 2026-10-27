"""Image uploads: validated by content, re-encoded as JPEG and saved under backend/uploads/."""

import os
import tempfile
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOADS_ROOT = Path(__file__).parent.parent.parent.parent / "uploads"
MAX_IMAGE_SIZE = 5 * 1024 * 1024

MAGIC_BYTES = (b"\xff\xd8\xff", b"\x89PNG")
MAX_IMAGE_PIXELS = 25_000_000
UNSUPPORTED_FORMAT = "Formato no permitido. Usa JPEG, PNG o WebP."
TOO_MANY_PIXELS = "La imagen es demasiado grande. Usa una de menos de 5000 × 5000 píxeles."


def validate_image_magic_bytes(content: bytes) -> None:
    """Validate image format using magic bytes (not file extension)."""
    if content.startswith(MAGIC_BYTES):
        return
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=UNSUPPORTED_FORMAT)


async def read_image_upload(file: UploadFile) -> bytes:
    """Read an uploaded image, refusing files that are too large or not an image."""
    content = await file.read(MAX_IMAGE_SIZE + 1)
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5MB."
        )
    validate_image_magic_bytes(content)
    return content


def _flatten_on_white(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, "white")
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return image.convert("RGB") if image.mode != "RGB" else image


def to_jpeg(content: bytes, size: tuple[int, int], pad: bool = False) -> bytes:
    """Resize to a JPEG of exactly that size: cropped to fill it, or padded on white to keep the whole image."""
    try:
        image = Image.open(BytesIO(content))
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=TOO_MANY_PIXELS)
        image.draft("RGB", (size[0] * 2, size[1] * 2))
        image = _flatten_on_white(ImageOps.exif_transpose(image))
        if pad:
            image = ImageOps.pad(image, size, Image.LANCZOS, color="white")
        else:
            image = ImageOps.fit(image, size, Image.LANCZOS)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=UNSUPPORTED_FORMAT)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def save_atomically(directory: Path, filename: str, content: bytes) -> None:
    """Write through a temporary file so a reader never sees a half-written image."""
    directory.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=directory, prefix=f"{filename}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as tmp_file:
            tmp_file.write(content)
        os.replace(tmp_name, directory / filename)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
