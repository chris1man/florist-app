export const isObjectWithValue = (val: any) => val && typeof val === 'object' && 'value' in val && typeof val.value === 'string';
export const isHttpsLink = (val: any) => typeof val === 'string' && val.startsWith('https://');
export const isDateField = (name: string) => name.toLowerCase().includes('дата');
export const formatShortDate = (val: any) => {
  let v = val;
  if (v && typeof v === 'object' && 'value' in v) v = v.value;
  if (typeof v === 'string' && /^\d{10}$/.test(v)) {
    const d = new Date(parseInt(v) * 1000);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}`;
  }
  return decodeHTMLEntities(v);
};
export const decodeHTMLEntities = (text: string) => {
  if (!text) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}; 