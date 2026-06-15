import { useParams, useNavigate } from 'react-router-dom';
import PlayerView from './PlayerView';

export default function PlayerRouteWrapper({ videos, discoverVideos = [], handleToggleFavorite, handleVideoSelect, handleUpdateVideo, handleIncrementVideoViewsAndPlays, currentUser, onDeleteVideo, onShareVideo, settings }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const activeDiscover = discoverVideos || [];

  const activeVideoId = id || (videos.length > 0 ? videos[0].id : (activeDiscover.length > 0 ? activeDiscover[0].id : null));

  let activeVideo = videos.find(v => String(v.id) === String(activeVideoId));
  if (!activeVideo) {
    activeVideo = activeDiscover.find(v => String(v.id) === String(activeVideoId));
  }

  if (!activeVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted gap-4">
        <p>No video selected.</p>
        <button
          className="px-5 py-2 bg-accent text-bg rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          onClick={() => navigate('/')}
        >
          Go back Home
        </button>
      </div>
    );
  }

  const combinedRelated = [...videos, ...activeDiscover.filter(dv => !videos.some(v => String(v.id) === String(dv.id)))];

  return (
    <PlayerView
      video={activeVideo}
      relatedVideos={combinedRelated}
      onVideoSelect={handleVideoSelect}
      onBack={() => navigate(-1)}
      onToggleFavorite={handleToggleFavorite}
      onUpdateVideo={handleUpdateVideo}
      onIncrementViewsAndPlays={handleIncrementVideoViewsAndPlays}
      currentUser={currentUser}
      onDeleteVideo={onDeleteVideo}
      onShareVideo={onShareVideo}
      settings={settings}
    />
  );
}
