import { useEffect } from 'react';

export function useDocumentMeta(location, videos, discoverVideos) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const routeTitles = {
      '/': 'Home | TeraPlay',
      '/discover': 'Discover | TeraPlay',
      '/library': 'My Library | TeraPlay',
      '/profile': 'Profile | TeraPlay',
      '/settings': 'Settings | TeraPlay',
      '/history': 'History | TeraPlay',
    };

    const pathname = location.pathname;
    if (pathname.startsWith('/player')) {
      const parts = pathname.split('/');
      const videoId = parts[parts.length - 1];
      const allVideos = [...videos, ...discoverVideos];
      const video = allVideos.find(v => String(v.id) === String(videoId));
      document.title = video ? `${video.title} | TeraPlay` : 'Playing | TeraPlay';
    } else {
      document.title = routeTitles[pathname] || 'TeraPlay';
    }
  }, [location.pathname, videos, discoverVideos]);
}
