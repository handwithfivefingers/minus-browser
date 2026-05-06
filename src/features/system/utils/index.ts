export const isSameURl = (url1: string, url2: string) => {
  try {
    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);
    const isSameOrigin = parsedUrl1.origin === parsedUrl2.origin;
    const isSameHref = parsedUrl1.href === parsedUrl2.href;
    return isSameOrigin && isSameHref;
  } catch (error) {
    return false;
  }
};
