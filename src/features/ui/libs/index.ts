export const isValidDomain = (url: string) => {
  // const regex = new RegExp(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/, "g");
  // const isValid = regex.test(url);
  // return isValid;
  // Remove protocol if present
  let domain = url.replace(/^https?:\/\//, "");

  // Extract domain part (remove port if present)
  const domainPart = domain.split(":")[0];

  // Regex for validating domain names
  // Allows: localhost, domain.com, sub.domain.com, etc.
  const domainRegex =
    /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/i;

  return domainRegex.test(domainPart);
};
