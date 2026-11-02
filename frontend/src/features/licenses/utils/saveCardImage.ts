import { downloadBlob } from '@/core/utils/downloadBlob';

export const saveCardImage = async (blob: Blob, fileName: string): Promise<void> => {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  const isPhone = window.matchMedia('(pointer: coarse)').matches;
  if (isPhone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  downloadBlob(blob, fileName);
};
