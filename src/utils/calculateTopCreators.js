export const calculateTopCreators = (discoverVideosList) => {
  const creatorMap = {};

  discoverVideosList.forEach(vid => {
    if (!vid || !vid.uploader || !vid.uploader.uid) return;
    const uid = vid.uploader.uid;
    if (!creatorMap[uid]) {
      creatorMap[uid] = {
        uid,
        username: vid.uploader.username || `User_${uid.substring(0, 5)}`,
        avatar: vid.uploader.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        videoCount: 0,
        totalViews: 0
      };
    }
    creatorMap[uid].videoCount += 1;
    creatorMap[uid].totalViews += (typeof vid.views === 'number' ? vid.views : 0);
  });

  const sorted = Object.values(creatorMap)
    .sort((a, b) => {
      if (b.totalViews !== a.totalViews) {
        return b.totalViews - a.totalViews;
      }
      return b.videoCount - a.videoCount;
    });

  return sorted.slice(0, 10);
};
