const download = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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
  download(blob, fileName);
};
