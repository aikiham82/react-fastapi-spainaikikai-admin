const KILOBYTE = 1024
const MEGABYTE = KILOBYTE * 1024

const megabytes = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

export const formatFileSize = (bytes: number): string => {
  if (bytes <= 0) return '0 KB'
  if (bytes < MEGABYTE) return `${Math.max(1, Math.round(bytes / KILOBYTE))} KB`
  return `${megabytes.format(bytes / MEGABYTE)} MB`
}
