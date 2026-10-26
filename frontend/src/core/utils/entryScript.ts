export const entryScript = (page: Document): string | null =>
  page.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null
