export const getHost = (domain: string): string => {
  if (!domain) return "";
  return `${domain}.ringotel.co`;
};
