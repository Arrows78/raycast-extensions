export function truncate(str: string, maxLength = 40) {
  const isTruncated = str.length > maxLength
  const truncatedStr = isTruncated ? str.slice(0, maxLength - 1) + '...' : str
  return { truncatedStr, isTruncated }
}
