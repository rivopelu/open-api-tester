export function generateId(): string {
  return crypto.randomUUID().split('-').join('')
}

export function generateRandomPassword(length: number = 5): string {
  const digits = '0123456789'
  const rand = (max: number) => Math.floor(Math.random() * max)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += digits[rand(digits.length)]
  }
  return password
}

export function generateProfilePicture(name: string): string {
  return `https://ui-avatars.com/api/?name=${name}&background=gray`
}

export function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function generateReferralCode(length: number = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand = (max: number) => Math.floor(Math.random() * max)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[rand(chars.length)]
  }
  return code
}
