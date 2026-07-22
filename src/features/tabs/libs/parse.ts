import dns from 'node:dns/promises'

import { parseDomain, ParseResultType, fromUrl } from 'parse-domain'

export interface AnalyzeDomainOutput {
  input: string | null
  isValid: boolean
  domain: string | null
  subdomain: string | null
  ip: string | null
  error: null | { message: string } | string
}

export async function analyzeDomain(inputUrl: string) {
  // Cấu trúc kết quả mặc định (Fallback)
  const result: AnalyzeDomainOutput = {
    input: inputUrl,
    isValid: false,
    domain: null,
    subdomain: null,
    ip: null,
    error: null,
  }

  try {
    // 1. Phân tích cấu trúc Domain
    const parseResult = parseDomain(fromUrl(inputUrl))

    if (parseResult.type === ParseResultType.Listed) {
      const { domain, topLevelDomains, subDomains } = parseResult

      result.isValid = true
      // Kết hợp domain và TLD để có tên miền chính chính xác (ví dụ: example.com hoặc example.co.uk)
      result.domain = `${domain}.${topLevelDomains.join('.')}`
      result.subdomain = subDomains.length > 0 ? subDomains.join('.') : null
    } else {
      // Trường hợp URL là địa chỉ IP tĩnh hoặc domain nội bộ không thuộc danh sách TLD quốc tế
      result.error = `Kiểu domain không được hỗ trợ hoặc là IP trực tiếp (${parseResult.type})`
    }

    // 2. Tra cứu IP qua DNS (Hỗ trợ lấy IP nếu tên miền đang hoạt động)
    if (result.domain) {
      try {
        const dnsLookup = await dns.lookup(result.domain)
        result.ip = dnsLookup.address
      } catch (dnsErr) {
        result.ip = 'Không thể phân giải DNS (Domain có thể không tồn tại)'
      }
    }
  } catch (error) {
    // Fallback: Khi URL bị lỗi nghiêm trọng hoặc không thể parse
    result.isValid = false
    result.error = (error as Error).message

    // Thử dùng Regex cơ bản làm phương án dự phòng cuối cùng để trích xuất chuỗi thô
    try {
      const rawMatch = inputUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
      result.domain = rawMatch || null
    } catch (_) {
      result.domain = new URL(inputUrl).hostname
    }
  }

  return result
}
