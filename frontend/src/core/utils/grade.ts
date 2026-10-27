const GRADE_PATTERN = /^(\d+)\s*(?:st|nd|rd|th|er|ro|do|to|vo|mo|º|°|\.º|\.er)?\s+(kyu|dan)$/i

const ordinalSuffix = (value: number): string => (value === 1 || value === 3 ? '.er' : '.º')

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

export const formatGradeNumber = (value: number, kind: string): string =>
  `${value}${ordinalSuffix(value)} ${capitalise(kind)}`

export const formatGradeEs = (grade: string | null | undefined): string => {
  if (!grade) return ''
  const match = GRADE_PATTERN.exec(grade.trim())
  if (!match) return grade
  return formatGradeNumber(Number(match[1]), match[2])
}
