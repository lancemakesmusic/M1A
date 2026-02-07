export const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim();
};

export const sanitizeEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>\s]/g, '').trim().toLowerCase();
};
