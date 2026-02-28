// Minimal API service stubs to prevent import errors

export const photosApi = {
  getPhotos: () => Promise.resolve([]),
  uploadPhoto: (data: any) => Promise.resolve({ success: true }),
  deletePhoto: (id: string) => Promise.resolve({ success: true })
};

export const storiesApi = {
  getStories: () => Promise.resolve([]),
  createStory: (data: any) => Promise.resolve({ success: true }),
  deleteStory: (id: string) => Promise.resolve({ success: true })
};

export const videosApi = {
  getVideos: () => Promise.resolve([]),
  uploadVideo: (data: any) => Promise.resolve({ success: true }),
  deleteVideo: (id: string) => Promise.resolve({ success: true })
};

export const liveApi = {
  getLiveStreams: () => Promise.resolve([]),
  createLiveStream: (data: any) => Promise.resolve({ success: true }),
  deleteLiveStream: (id: string) => Promise.resolve({ success: true })
};
