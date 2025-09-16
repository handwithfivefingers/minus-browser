// export const isValidDomain = (url: string) => {
//   // const regex = new RegExp(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/, "g");
//   // const isValid = regex.test(url);
//   // return isValid;
//   // Remove protocol if present
//   let domain = url.replace(/^https?:\/\//, "");

//   // Extract domain part (remove port if present)
//   const domainPart = domain.split(":")[0];

//   // Regex for validating domain names
//   // Allows: localhost, domain.com, sub.domain.com, etc.
//   const domainRegex =
//     /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i;

//   return domainRegex.test(domainPart);
// };

// Validates both domain names and IP addresses
export const isValidDomainOrIP = (url: string) => {
  try {
    // Remove protocol if present
    let address = url.replace(/^https?:\/\//, "");

    // Handle IPv6 with brackets and port
    if (address.startsWith("[")) {
      const bracketEnd = address.indexOf("]");
      if (bracketEnd !== -1) {
        const ipv6 = address.substring(1, bracketEnd);
        return isValidIPv6(ipv6);
      }
    }

    // Extract address part (remove port if present)
    const addressPart = address.split(":")[0];

    // Check if it's an IP address first
    if (isValidIPv4(addressPart)) {
      return true;
    }

    if (isValidIPv6(addressPart)) {
      return true;
    }

    // If not IP, validate as domain
    return isValidDomainOrIPSimple(addressPart);
  } catch (error) {
    return false;
  }
};

// IPv4 validation
const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
};

// IPv6 validation (simplified)
const isValidIPv6 = (ip: string): boolean => {
  const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)+::$/;
  return ipv6Regex.test(ip);
};

// Domain validation (reusing from previous)
const isValidDomain = (domain: string): boolean => {
  // Handle localhost
  if (domain === "localhost") {
    return true;
  }

  // Split into parts for validation
  const parts = domain.split(".");

  // Must have at least 2 parts for regular domains
  if (parts.length < 2) {
    return false;
  }

  // Validate each part
  for (const part of parts) {
    if (!part || part.length === 0) return false;
    if (part.startsWith("-") || part.endsWith("-")) return false;
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part)) return false;
  }

  // Last part (TLD) must be at least 2 characters and contain only letters
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) {
    return false;
  }

  return true;
};

// Alternative: Use built-in URL constructor (more permissive)
export const isValidDomainOrIPSimple = (url: string): boolean => {
  try {
    // Add protocol if missing
    const testUrl = url.startsWith("http") ? url : `http://${url}`;
    const urlObj = new URL(testUrl);

    // URL constructor handles both domains and IPs
    return urlObj.hostname !== "";
  } catch (error) {
    return false;
  }
};

// Test all cases
console.log("=== Domain and IP Validation ===");

const allTestCases = [
  // // Domains
  // "domain.com",
  // "https://sub.domain.com",
  // "localhost:3000",

  // IPv4
  "192.168.1.1",
  "http://127.0.0.1:8080",
  "10.0.0.255",

  // IPv6
  "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  "[2001:db8::1]:8080",
  "::1",

  // Invalid
  "999.999.999.999",
  "invalid",
  "",
  "domain.c",

  "landing.flodev.net",
  "landing.flodev.net",
  "landing.flodev.net/v5",
  "landing.flodev.net/v4",
];

// allTestCases.forEach((test) => {
//   console.log(`${test.padEnd(40)} -> Advanced: ${isValidDomainOrIP(test)}, Simple: ${isValidDomainOrIPSimple(test)}`);
// });

// Utility function to determine what type of address it is
export const getAddressType = (url: string): "domain" | "ipv4" | "ipv6" | "localhost" | "invalid" => {
  try {
    let address = url.replace(/^https?:\/\//, "").split(":")[0];

    // Handle IPv6 brackets
    if (address.startsWith("[") && address.endsWith("]")) {
      address = address.slice(1, -1);
    }

    if (address === "localhost") return "localhost";
    if (isValidIPv4(address)) return "ipv4";
    if (isValidIPv6(address)) return "ipv6";
    if (isValidDomain(address)) return "domain";

    return "invalid";
  } catch {
    return "invalid";
  }
};

// Test address type detection
// console.log("\n=== Address Type Detection ===");
// const typeTestCases = ["domain.com", "192.168.1.1", "2001:db8::1", "localhost", "invalid"];
// typeTestCases.forEach((test) => {
//   console.log(`${test} -> ${getAddressType(test)}`);
// });

export const debounce = <A = unknown, R = void>(callback: (args?: A) => R, n: number) => {
  let timer: NodeJS.Timeout | undefined | number = undefined;
  return (args?: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => callback(args), n);
  };
};
