export const detectResolution = (filename, streams) => {
  if (streams && Object.keys(streams).length > 0) {
    if (streams['M3U8_AUTO_1080']) return '1080P Full HD';
    if (streams['M3U8_AUTO_720']) return '720P HD';
    if (streams['M3U8_AUTO_480']) return '480P';
    if (streams['M3U8_AUTO_360']) return '360P';
  }

  const nameLower = (filename || '').toLowerCase();
  if (nameLower.includes('4k') || nameLower.includes('2160p')) return '4K Ultra HD';
  if (nameLower.includes('1080p') || nameLower.includes('fhd')) return '1080P Full HD';
  if (nameLower.includes('720p') || nameLower.includes('hdtc') || nameLower.includes('hdrip') || nameLower.includes('720')) return '720P HD';
  if (nameLower.includes('480p') || nameLower.includes('480')) return '480P';
  if (nameLower.includes('360p') || nameLower.includes('360')) return '360P';

  return 'Auto';
};
