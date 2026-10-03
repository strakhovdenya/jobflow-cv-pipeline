const FALLBACK_ASCII_NAME = 'download';
const NON_PRINTABLE_ASCII_OR_QUOTING = /[^\x20-\x7e]|["\\]/gu;
const RFC_5987_UNRESERVED_LEFT_BY_URI_COMPONENT = /['()*]/g;

const toAsciiFileName = (fileName: string): string => {
  const ascii = fileName.replace(NON_PRINTABLE_ASCII_OR_QUOTING, '_');
  return ascii === '' ? FALLBACK_ASCII_NAME : ascii;
};

const toPercentEncoded = (char: string): string =>
  `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;

const toExtendedFileName = (fileName: string): string =>
  encodeURIComponent(fileName).replace(
    RFC_5987_UNRESERVED_LEFT_BY_URI_COMPONENT,
    toPercentEncoded,
  );

export const buildContentDisposition = (fileName: string): string =>
  `attachment; filename="${toAsciiFileName(fileName)}"; ` +
  `filename*=UTF-8''${toExtendedFileName(fileName)}`;
