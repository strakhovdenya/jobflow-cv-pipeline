import { ServerResponse } from 'http';
import { buildContentDisposition } from './content-disposition';

const EXTENDED_PREFIX = "filename*=UTF-8''";

const extractAscii = (header: string): string => {
  const match = /filename="([^;]*)";/.exec(header);
  return match ? match[1] : '';
};

const extractExtended = (header: string): string =>
  header.slice(header.indexOf(EXTENDED_PREFIX) + EXTENDED_PREFIX.length);

describe('buildContentDisposition', () => {
  it('builds header for ASCII name', () => {
    expect(buildContentDisposition('report.pdf')).toBe(
      `attachment; filename="report.pdf"; ${EXTENDED_PREFIX}report.pdf`,
    );
  });

  it('builds header for Cyrillic name', () => {
    const fileName = 'Strakhov_Denys_Яндекс_Разработчик_CV.pdf';

    const header = buildContentDisposition(fileName);

    expect(extractAscii(header)).not.toMatch(/\p{Script=Cyrillic}/u);
    expect(header).toContain(EXTENDED_PREFIX);
    expect(decodeURIComponent(extractExtended(header))).toBe(fileName);
  });

  it('replaces quote and backslash in ASCII part', () => {
    const fileName = 'a"b\\c.pdf';

    const header = buildContentDisposition(fileName);

    expect(extractAscii(header)).toBe('a_b_c.pdf');
    expect(decodeURIComponent(extractExtended(header))).toBe(fileName);
  });

  it('keeps ASCII part non-empty', () => {
    const header = buildContentDisposition('Яндекс');

    expect(extractAscii(header)).not.toBe('');
    expect(extractAscii(buildContentDisposition(''))).not.toBe('');
  });

  it('encodes RFC 5987 reserved characters', () => {
    const extended = extractExtended(buildContentDisposition("a'b(c)d*e.pdf"));

    expect(extended).toBe('a%27b%28c%29d%2Ae.pdf');
  });

  it('result is a valid Node header value', () => {
    const response = new ServerResponse({ method: 'GET' } as never);
    const header = buildContentDisposition('Яндекс_Разработчик_CV.pdf');

    expect(() =>
      response.setHeader('Content-Disposition', header),
    ).not.toThrow();
  });
});
