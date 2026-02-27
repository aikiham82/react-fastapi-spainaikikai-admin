import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadCoverImageMutation, useDeleteCoverImageMutation } from '../hooks/mutations/useSeminarMutations';

interface CoverImageDropZoneProps {
  seminarId: string;
  currentImageUrl?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

const validateFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Formato no permitido. Usa JPEG, PNG o WebP.';
  }
  if (file.size > MAX_SIZE) {
    return 'El archivo supera el límite de 5MB.';
  }
  return null;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const CoverImageDropZone = ({ seminarId, currentImageUrl }: CoverImageDropZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useUploadCoverImageMutation();
  const deleteMutation = useDeleteCoverImageMutation();

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({ seminarId, file });
    } catch {
      setUploadError('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(seminarId);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so the same file can be re-selected after removal
    e.target.value = '';
  };

  const isDisabled = isUploading || isDeleting;

  return (
    <div>
      <div
        className={cn(
          'relative aspect-video rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors',
          !currentImageUrl && !isDisabled && 'cursor-pointer',
          isDragging && !currentImageUrl
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 bg-muted/30',
          currentImageUrl && 'border-transparent'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isDisabled) {
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }
        }}
        onClick={() => {
          if (!isDisabled && !currentImageUrl) {
            inputRef.current?.click();
          }
        }}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Preview state */}
        {currentImageUrl && !isUploading ? (
          <>
            <img
              src={`${API_BASE_URL}${currentImageUrl}`}
              alt="Imagen de portada"
              className="w-full h-full object-cover"
            />
            {/* X button to remove */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-60"
              aria-label="Eliminar imagen de portada"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </>
        ) : null}

        {/* Upload loading overlay */}
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : null}

        {/* Empty state */}
        {!currentImageUrl && !isUploading ? (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Camera className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground/70">
              JPEG, PNG o WebP — máx. 5MB
            </p>
          </div>
        ) : null}
      </div>

      {/* Inline error */}
      {uploadError && (
        <p className="text-sm text-destructive mt-1">{uploadError}</p>
      )}
    </div>
  );
};
