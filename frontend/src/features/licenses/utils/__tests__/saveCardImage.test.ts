import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { saveCardImage } from '../saveCardImage';

const IMAGE = new Blob(['png'], { type: 'image/png' });

const offerShare = (canShare: boolean, share = vi.fn().mockResolvedValue(undefined)) => {
  Object.assign(navigator, { canShare: vi.fn(() => canShare), share });
  return share;
};

const onPointer = (coarse: boolean) => {
  vi.stubGlobal('matchMedia', () => ({ matches: coarse }));
};

describe('saveCardImage', () => {
  let clickedDownload: string | null;

  beforeEach(() => {
    clickedDownload = null;
    onPointer(true);
    URL.createObjectURL = vi.fn(() => 'blob:card');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it('shares the image where the browser can share files', async () => {
    const share = offerShare(true);

    await saveCardImage(IMAGE, 'carne.png');

    expect(share.mock.calls[0][0].files[0].name).toBe('carne.png');
    expect(clickedDownload).toBeNull();
  });

  it('downloads the image where the browser cannot share files', async () => {
    offerShare(false);

    await saveCardImage(IMAGE, 'carne.png');

    expect(clickedDownload).toBe('carne.png');
  });

  it('downloads the image on a computer, even if the browser can share', async () => {
    onPointer(false);
    const share = offerShare(true);

    await saveCardImage(IMAGE, 'carne.png');

    expect(share).not.toHaveBeenCalled();
    expect(clickedDownload).toBe('carne.png');
  });

  it('does nothing more when the member closes the share sheet', async () => {
    offerShare(true, vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')));

    await saveCardImage(IMAGE, 'carne.png');

    expect(clickedDownload).toBeNull();
  });

  it('downloads the image when sharing is refused', async () => {
    offerShare(true, vi.fn().mockRejectedValue(new DOMException('refused', 'NotAllowedError')));

    await saveCardImage(IMAGE, 'carne.png');

    expect(clickedDownload).toBe('carne.png');
  });
});
