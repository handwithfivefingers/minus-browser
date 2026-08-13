export const isValidDomainOrIP = (url: string) => {
  try {
    // Remove protocol if present
    const address = url.replace(/^https?:\/\//, '')

    // Handle IPv6 with brackets and port
    if (address.startsWith('[')) {
      const bracketEnd = address.indexOf(']')
      if (bracketEnd !== -1) {
        const ipv6 = address.substring(1, bracketEnd)
        return isValidIPv6(ipv6)
      }
    }

    // Extract address part (remove port if present)
    const addressPart = address.split(':')[0]

    // Check if it's an IP address first
    if (isValidIPv4(addressPart)) {
      return true
    }

    if (isValidIPv6(addressPart)) {
      return true
    }

    // If not IP, validate as domain
    return isValidDomainOrIPSimple(addressPart)
  } catch (error) {
    return false
  }
}

// IPv4 validation
const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

// IPv6 validation (simplified)
const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}?::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)+::$/
  return ipv6Regex.test(ip)
}

// Domain validation (reusing from previous)
const isValidDomain = (domain: string): boolean => {
  // Handle localhost
  if (domain === 'localhost') {
    return true
  }

  // Split into parts for validation
  const parts = domain.split('.')

  // Must have at least 2 parts for regular domains
  if (parts.length < 2) {
    return false
  }

  // Validate each part
  for (const part of parts) {
    if (!part || part.length === 0) return false
    if (part.startsWith('-') || part.endsWith('-')) return false
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part)) return false
  }

  // Last part (TLD) must be at least 2 characters and contain only letters
  const tld = parts[parts.length - 1]
  if (tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) {
    return false
  }

  return true
}

// Alternative: Use built-in URL constructor (more permissive)
export const isValidDomainOrIPSimple = (url: string): boolean => {
  try {
    // Add protocol if missing
    const testUrl = url.startsWith('http') ? url : `http://${url}`
    const urlObj = new URL(testUrl)

    // URL constructor handles both domains and IPs
    return urlObj.hostname !== ''
  } catch (error) {
    return false
  }
}

// Utility function to determine what type of address it is
export const getAddressType = (url: string): 'domain' | 'ipv4' | 'ipv6' | 'localhost' | 'invalid' => {
  try {
    let address = url.replace(/^https?:\/\//, '')

    // Handle IPv6 brackets first (before splitting on ':')
    if (address.startsWith('[')) {
      const bracketEnd = address.indexOf(']')
      if (bracketEnd !== -1) {
        address = address.substring(1, bracketEnd)
      }
    } else {
      address = address.split(':')[0]
    }

    if (address === 'localhost') return 'localhost'
    if (isValidIPv4(address)) return 'ipv4'
    if (isValidIPv6(address)) return 'ipv6'
    if (isValidDomain(address)) return 'domain'

    return 'invalid'
  } catch {
    return 'invalid'
  }
}

export const debounce = <A = unknown, R = void>(callback: (args?: A) => R, n: number) => {
  let timer: NodeJS.Timeout | undefined | number = undefined
  return (args?: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => callback(args), n)
  }
}

export const navigateOrSearch = (input: string, searchEngineUrl = 'https://google.com/search?q=') => {
  const query = input.trim()
  if (!query) return

  // 1. Check for explicit protocols (http, https, ftp, file)
  if (/^(https?|ftp|file):\/\//i.test(query)) {
    return query
  }

  // 2. Check for Localhost or IP Addresses (e.g., localhost:3000 or 127.0.0.1)
  const localOrIpRegex = /^(localhost|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])(:\d+)?(\/.*)?$/i
  if (localOrIpRegex.test(query)) {
    return `http://${query}` // Assume http for local
  }

  // 3. Check for valid Domain patterns (e.g., example.com, site.org/path)
  // Rule: Must have a dot, NO spaces, and end with a likely TLD (2+ chars)
  const domainRegex = /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}(\/.*)?$/i
  if (!/\s/.test(query) && domainRegex.test(query)) {
    return `https://${query}`
  }

  // 4. Default: Treat as a Search Query
  return searchEngineUrl + encodeURIComponent(query)
}
