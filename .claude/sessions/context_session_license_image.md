# License Image Feature Implementation

## Status: COMPLETED

## Overview
Implemented license image generation feature that creates PNG images of member licenses by overlaying member data on a template image.

## Implementation Summary

### Backend Changes

#### New Files Created:
1. **`backend/src/infrastructure/assets/`** - Directory with assets
   - `Template.png` - License card template image (copied from PHP backend)
   - `PublicSans-Thin.ttf` - Font for text overlay (copied from PHP backend)

2. **`backend/src/application/ports/license_image_service.py`**
   - `LicenseImageData` dataclass for image generation input
   - `LicenseImageServicePort` abstract interface

3. **`backend/src/infrastructure/adapters/services/license_image_service.py`**
   - `LicenseImageService` implementation using Pillow
   - Text positions and font sizes matching PHP implementation:
     - Year: (1340, 260), font 40
     - Insurance: (1200, 340), font 30
     - Surname: (550, 460), font 40
     - First Name: (450, 605), font 40
     - Birth Date: (1220, 605), font 40
     - License #: (450, 760), font 40
     - DNI: (1100, 760), font 40

4. **`backend/src/application/use_cases/license/generate_license_image_use_case.py`**
   - `GenerateLicenseImageUseCase` orchestrating image generation
   - `LicenseImageResult` dataclass for returning image bytes and metadata
   - Fiscal year calculation: `year + 1` if month >= 10 (October)

#### Modified Files:
1. **`backend/src/domain/exceptions/license.py`**
   - Added `LicenseImageGenerationError` exception

2. **`backend/src/application/ports/__init__.py`**
   - Exported `LicenseImageServicePort` and `LicenseImageData`

3. **`backend/src/application/use_cases/__init__.py`**
   - Exported `GenerateLicenseImageUseCase` and `LicenseImageResult`

4. **`backend/src/infrastructure/adapters/services/__init__.py`**
   - Exported `LicenseImageService`

5. **`backend/src/infrastructure/web/dependencies.py`**
   - Added `get_license_image_service()` factory
   - Added `get_generate_license_image_use_case()` factory

6. **`backend/src/infrastructure/web/routers/licenses.py`**
   - Added `GET /{license_id}/image` endpoint
   - Returns PNG image as StreamingResponse

7. **`backend/src/infrastructure/web/dto/license_dto.py`**
   - Added `image_url: Optional[str]` to `LicenseResponse`

8. **`backend/src/infrastructure/web/mappers_license.py`**
   - Generate `image_url` as `/api/v1/licenses/{id}/image` for licenses with members

### Frontend Changes (frontend-mobile)

#### Modified Files:
1. **`frontend-mobile/src/modules/licenses/domain/License.ts`**
   - Added `image_url?: string` to `License` interface

2. **`frontend-mobile/src/sections/license/License.tsx`**
   - Imported `DownloadLicenseButton` component
   - Imported `API_URL` from Config
   - Added download button when `license.image_url` exists

### API Endpoint

```
GET /api/v1/licenses/{license_id}/image
```

**Response:**
- Content-Type: `image/png`
- Content-Disposition: `attachment; filename=licencia_{surname}_{firstname}_{year}.png`

**Errors:**
- 404: License or Member not found
- 500: Image generation failed

## Technical Details

### License Year Calculation
The license year follows the fiscal calendar:
- If current month >= October (10): year + 1
- Otherwise: current year

### Text Overlay
Member data is overlaid on the template image using Pillow:
- All text in black color (0, 0, 0)
- Names converted to uppercase
- Dates formatted as DD/MM/YYYY

### Dependencies
- Pillow (PIL) ^12.1.0 - already in pyproject.toml

## Testing Notes
- Backend compiles successfully
- Frontend builds successfully
- Image generation requires valid Template.png and PublicSans-Thin.ttf in assets directory

## Next Steps (if needed)
- Add unit tests for `LicenseImageService`
- Add unit tests for `GenerateLicenseImageUseCase`
- Add frontend tests for download functionality
- Consider caching generated images
