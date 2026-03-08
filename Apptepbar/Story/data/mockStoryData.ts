import { StoryFile } from '../app/(tabs)/Story';

export const mockStoryFiles: StoryFile[] = [
  {
    id: 'story_1',
    name: 'Sunset Beach Video.mp4',
    uri: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
    size: 5242880,
    type: 'video',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: 'story_2',
    name: 'Mountain Landscape.jpg',
    uri: 'https://picsum.photos/400/600?random=1',
    size: 2097152,
    type: 'image',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
  },
  {
    id: 'story_3',
    name: 'City Night Timelapse.mp4',
    uri: 'https://sample-videos.com/video321/mp4/480/SampleVideo_1280x720_1mb.mp4',
    size: 8388608,
    type: 'video',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
  },
  {
    id: 'story_4',
    name: 'Food Photography.jpg',
    uri: 'https://picsum.photos/400/600?random=2',
    size: 1572864,
    type: 'image',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
  },
  {
    id: 'story_5',
    name: 'Ocean Waves.mp4',
    uri: 'https://sample-videos.com/video321/mp4/360/SampleVideo_360x240_1mb.mp4',
    size: 4194304,
    type: 'video',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
  },
  {
    id: 'story_6',
    name: 'Street Photography.jpg',
    uri: 'https://picsum.photos/400/600?random=3',
    size: 3145728,
    type: 'image',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
  },
  {
    id: 'story_7',
    name: 'Drone Flight Video.mp4',
    uri: 'https://sample-videos.com/video321/mp4/720/SampleVideo_1280x720_2mb.mp4',
    size: 10485760,
    type: 'video',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
  },
];
