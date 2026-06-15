export const categorizeVideo = (filename) => {
  const titleLower = (filename || '').toLowerCase();

  if (titleLower.includes('movie') || titleLower.includes('film') || titleLower.includes('trailer') || titleLower.includes('cinematic') || titleLower.includes('cinema') || titleLower.includes('teaser') || titleLower.includes('episode') || titleLower.includes('season')) {
    return 'Cinema';
  }
  if (titleLower.includes('lofi') || titleLower.includes('lo-fi') || titleLower.includes('relax') || titleLower.includes('beats') || titleLower.includes('chill') || titleLower.includes('music') || titleLower.includes('song') || titleLower.includes('ambient') || titleLower.includes('playlist')) {
    return 'Lo-Fi';
  }
  if (titleLower.includes('animation') || titleLower.includes('anime') || titleLower.includes('cartoon') || titleLower.includes('blender') || titleLower.includes('cgi') || titleLower.includes('animated') || titleLower.includes('sintel') || titleLower.includes('bunny')) {
    return 'Animation';
  }
  if (titleLower.includes('nature') || titleLower.includes('travel') || titleLower.includes('fjord') || titleLower.includes('scenery') || titleLower.includes('forest') || titleLower.includes('documentary') || titleLower.includes('drone')) {
    return 'Nature';
  }
  if (titleLower.includes('tech') || titleLower.includes('science') || titleLower.includes('nasa') || titleLower.includes('space') || titleLower.includes('dev') || titleLower.includes('code') || titleLower.includes('program')) {
    return 'Tech';
  }
  if (titleLower.includes('tutorial') || titleLower.includes('course') || titleLower.includes('guide') || titleLower.includes('learn') || titleLower.includes('how to') || titleLower.includes('how-to') || titleLower.includes('lesson')) {
    return 'Tutorials';
  }

  return 'General';
};
