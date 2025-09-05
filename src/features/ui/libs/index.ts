export const isValidDomain = (url: string) => {
  const regex = new RegExp(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/, "g");
  const isValid = regex.test(url);
  return isValid;
};
