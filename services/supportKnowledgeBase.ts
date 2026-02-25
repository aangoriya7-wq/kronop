// ==================== KRONOP APP COMPREHENSIVE KNOWLEDGE BASE ====================
// Complete knowledge base for Kronop AI Support System
// This file contains all information about Kronop app features, functionality, and troubleshooting

export const KRONOP_KNOWLEDGE_BASE = {
  // ==================== APP OVERVIEW ====================
  appOverview: {
    name: "Kronop",
    type: "Video Sharing Platform",
    version: "1.0.0",
    description: "A comprehensive video sharing platform where users can upload reels, videos, photos, go live, and earn from their content",
    platform: "React Native with Expo",
    backend: "Node.js with MongoDB",
    cdn: "BunnyCDN",
    deployment: "Koyeb"
  },

  // ==================== CONTENT TYPES ====================
  contentTypes: {
    reels: {
      name: "Reels",
      description: "Short vertical videos (15-60 seconds)",
      uploadMethod: "Direct upload via ReelsBridge",
      storage: "BunnyCDN Stream Library (ID: 593793)",
      maxFileSize: "100MB for simple upload, unlimited for chunk upload",
      supportedFormats: ["mp4", "mov", "avi"],
      features: ["HLS streaming", "chunk upload for large files", "metadata support"]
    },
    videos: {
      name: "Videos",
      description: "Longer horizontal videos (1-30 minutes)",
      uploadMethod: "Direct upload via VideoBridge",
      storage: "BunnyCDN Stream Library",
      maxFileSize: "100MB for simple upload, unlimited for chunk upload",
      supportedFormats: ["mp4", "mov", "avi"],
      features: ["HLS streaming", "chunk upload for large files"]
    },
    photos: {
      name: "Photos",
      description: "Static images with categories",
      uploadMethod: "Direct upload via PhotoBridge",
      storage: "BunnyCDN Storage Zone (photu)",
      maxFileSize: "10MB",
      supportedFormats: ["jpg", "jpeg", "png", "gif", "webp", "bmp"],
      features: ["thumbnail generation", "category support", "batch upload"]
    },
    stories: {
      name: "Stories",
      description: "Ephemeral content (24 hours)",
      uploadMethod: "Direct upload via StoryBridge",
      storage: "BunnyCDN Stream Library",
      maxFileSize: "50MB",
      supportedFormats: ["mp4", "jpg", "png"],
      features: ["auto-expiry", "HLS streaming for videos"]
    },
    live: {
      name: "Live Streams",
      description: "Real-time video streaming",
      uploadMethod: "Live streaming via LiveBridge",
      storage: "BunnyCDN Stream Library",
      maxFileSize: "Unlimited (streaming)",
      supportedFormats: ["rtmp", "webRTC"],
      features: ["real-time chat", "viewer count", "recording"]
    },
    shayariPhotos: {
      name: "Shayari Photos",
      description: "Photos with text overlays (poetry)",
      uploadMethod: "Direct upload via ShayariBridge",
      storage: "BunnyCDN Storage Zone",
      maxFileSize: "10MB",
      supportedFormats: ["jpg", "jpeg", "png"],
      features: ["text overlay", "author attribution", "categorization"]
    }
  },

  // ==================== USER PROFILE MANAGEMENT ====================
  userProfile: {
    fields: {
      basic: ["username", "displayName", "bio", "email", "phone"],
      media: ["avatar", "profilePic", "cover_image_url", "avatar_url"],
      social: ["followers", "following", "verified"],
      content: ["savedContent", "seen_reels"],
      metadata: ["createdAt", "pushToken"]
    },
    updateMethods: {
      profile: "PUT /users/profile",
      avatar: "POST /users/upload-image (type: profile)",
      cover: "POST /users/upload-image (type: cover)"
    },
    validation: {
      username: "unique, sparse index",
      email: "unique, sparse index, lowercase",
      phone: "unique, sparse index, optional"
    }
  },

  // ==================== UPLOAD SYSTEM ====================
  uploadSystem: {
    authentication: {
      currentStatus: "BYPASSED FOR TESTING",
      defaultUserId: "guest_user",
      note: "All uploads work without authentication for testing purposes"
    },
    process: {
      step1: "File selection and validation",
      step2: "Metadata preparation (title, description, tags, location)",
      step3: "Bridge service upload (ReelsBridge, PhotoBridge, etc.)",
      step4: "BunnyCDN upload (Stream API for videos, Storage API for photos)",
      step5: "Database record creation",
      step6: "URL generation and response"
    },
    chunkUpload: {
      threshold: "100MB",
      chunkSize: "2MB",
      maxRetries: 3,
      retryDelay: "Exponential backoff (1s, 2s, 3s)"
    },
    errorHandling: {
      networkErrors: "Retry with exponential backoff",
      authErrors: "Fallback to guest_user",
      sizeErrors: "Suggest chunk upload",
      formatErrors: "Convert to supported format"
    }
  },

  // ==================== API ENDPOINTS ====================
  apiEndpoints: {
    baseUrl: {
      development: "http://0.0.0.0:3000",
      production: "https://kronop-9gju.onrender.com"
    },
    content: {
      photos: {
        list: "GET /api/photos",
        upload: "POST /content/photo/upload",
        user: "GET /content/photo/user",
        delete: "DELETE /photos/:id"
      },
      reels: {
        list: "GET /api/reels",
        upload: "POST /content/reels/upload",
        user: "GET /content/reels/user",
        delete: "DELETE /reels/:id"
      },
      videos: {
        list: "GET /api/videos",
        upload: "POST /content/video/upload",
        user: "GET /content/video/user",
        delete: "DELETE /videos/:id"
      },
      stories: {
        list: "GET /api/stories",
        upload: "POST /content/story/upload",
        delete: "DELETE /stories/:id"
      },
      live: {
        list: "GET /api/live",
        upload: "POST /content/live/upload"
      },
      saved: {
        list: "GET /content/saved",
        save: "POST /content/saved",
        unsave: "DELETE /content/saved/:itemId"
      }
    },
    user: {
      profile: {
        get: "GET /api/users/profile",
        update: "PUT /api/users/profile",
        uploadImage: "POST /users/upload-image"
      },
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        logout: "POST /api/auth/logout"
      }
    }
  },

  // ==================== BUNNYCDN CONFIGURATION ====================
  bunnyCDN: {
    stream: {
      reels: {
        libraryId: "593793",
        host: "video.bunnycdn.com",
        apiKey: "Configured in BUNNY_CONFIG"
      },
      videos: {
        libraryId: "Separate library",
        host: "video.bunnycdn.com",
        apiKey: "Configured in BUNNY_CONFIG"
      }
    },
    storage: {
      photos: {
        storageZone: "photu",
        host: "storage.bunnycdn.com",
        apiKey: "Configured in BUNNY_CONFIG"
      }
    },
    urlFormats: {
      stream: "https://{libraryId}.bunnycdn.com/{guid}/playlist.m3u8",
      storage: "https://{host}/{storageZone}/{fileName}"
    }
  },

  // ==================== APP SCREENS AND NAVIGATION ====================
  appScreens: {
    tabs: {
      home: "Main feed with content",
      reels: "Reels feed with vertical scrolling",
      video: "Video feed with horizontal layout",
      profile: "User profile and settings",
      imageSearch: "Photo search and categories"
    },
    modal: {
      chatDetail: "Direct messaging",
      blockedUsers: "Blocked users management",
      helpCenter: "AI-powered support"
    },
    dynamic: {
      live: "[id] - Live streaming room",
      photos: "[category] - Category photos",
      "[id]": "Individual content view"
    }
  },

  // ==================== FEATURES AND FUNCTIONALITY ====================
  features: {
    contentInteraction: {
      like: "Heart/like button on all content",
      comment: "Comment system with threads",
      share: "Share to external platforms",
      save: "Save content to profile",
      support: "Monetary support for creators"
    },
    smartFeed: {
      description: "AI-powered content recommendation",
      factors: ["user interests", "viewing history", "engagement patterns"],
      categories: ["Personalized feed", "Trending content", "Category-based"]
    },
    realTime: {
      notifications: "Push notifications for interactions",
      liveStreaming: "Real-time video streaming",
      messaging: "Instant messaging between users"
    }
  },

  // ==================== TROUBLESHOOTING GUIDE ====================
  troubleshooting: {
    uploadIssues: {
      fileTooLarge: {
        problem: "File size exceeds upload limit",
        solution: "Use chunk upload for files > 100MB. The system automatically handles this.",
        steps: ["Select file", "Add metadata", "Upload - system will auto-chunk if needed"]
      },
      networkError: {
        problem: "Upload fails due to network issues",
        solution: "Check internet connection and retry. System has automatic retry with exponential backoff.",
        steps: ["Check WiFi/mobile data", "Wait for stable connection", "Retry upload"]
      },
      formatNotSupported: {
        problem: "File format not supported",
        solution: "Convert to supported format. Videos: MP4, Photos: JPG/PNG",
        steps: ["Use video converter app", "Convert to MP4", "Upload converted file"]
      },
      authenticationError: {
        problem: "Auth token expired or invalid",
        solution: "Currently bypassed for testing. All uploads work as guest_user.",
        note: "No login required during testing phase"
      }
    },
    playbackIssues: {
      videoNotPlaying: {
        problem: "Video doesn't play or buffers",
                        solution: "Check HLS stream URL and internet connection",
                        steps: ["Check internet speed", "Wait for buffering", "Try different content"]
                      },
      audioNotWorking: {
        problem: "Video plays but no audio",
        solution: "Check device volume and video encoding",
        steps: ["Check device volume", "Check video mute state", "Try headphones"]
      }
    },
    appIssues: {
      appCrashing: {
        problem: "App crashes or freezes",
        solution: "Clear cache and restart app",
        steps: ["Close app completely", "Clear app cache", "Restart phone", "Reopen app"]
      },
      loginIssues: {
        problem: "Cannot login to account",
        solution: "Check credentials and network. Currently bypassed for testing.",
        note: "All features work without login during testing"
      }
    }
  },

  // ==================== COMMON WORKFLOWS ====================
  workflows: {
    uploadReel: {
      steps: [
        "Tap + button or upload icon",
        "Select 'Reel' from content types",
        "Choose video from gallery or record new",
        "Add title, description, and tags",
        "Tap 'Upload' - system handles chunking if needed",
        "Wait for upload completion",
        "Reel appears in reels feed"
      ],
      estimatedTime: "30 seconds - 5 minutes depending on file size and network"
    },
    uploadPhoto: {
      steps: [
        "Go to Photos tab or tap + button",
        "Select 'Photo' from options",
        "Choose image from gallery",
        "Add title, description, and category",
        "Tap 'Upload'",
        "Wait for upload completion",
        "Photo appears in photos feed"
      ],
      estimatedTime: "10-30 seconds depending on file size"
    },
    updateProfile: {
      steps: [
        "Go to Profile tab",
        "Tap Edit Profile button",
        "Update desired fields (name, bio, etc.)",
        "Tap 'Save Changes'",
        "Profile updated successfully"
      ],
      fields: ["username", "displayName", "bio", "email", "phone"]
    },
    goLive: {
      steps: [
        "Go to Live tab",
        "Tap 'Go Live' button",
        "Set stream title and description",
        "Choose stream quality",
        "Tap 'Start Streaming'",
        "Live stream begins"
      ],
      requirements: ["Stable internet connection", "Camera permission", "Microphone permission"]
    }
  },

  // ==================== ERROR MESSAGES AND SOLUTIONS ====================
  errorSolutions: {
    "Network Error": {
      message: "Please check your internet connection and try again",
      solution: "Check WiFi/mobile data, wait for stable connection, retry"
    },
    "Upload Failed": {
      message: "File upload failed. Please try again.",
      solution: "Check file size, format, and network connection"
    },
    "Authentication Required": {
      message: "Please login to continue",
      solution: "Currently bypassed - all features work without login"
    },
    "Content Not Found": {
      message: "The requested content could not be found",
      solution: "Content may have been deleted or expired"
    },
    "Server Error": {
      message: "Server is experiencing issues. Please try again later.",
      solution: "Wait a few minutes and retry, check status page"
    }
  },

  // ==================== CONTACT INFORMATION ====================
  contactInfo: {
    phone: "9039012335",
    email: "angoriyaarun311@gmail.com",
    support: "Available 24/7 through AI chat and direct contact",
    emergency: "For urgent issues, call the phone number directly"
  },

  // ==================== DEVELOPMENT INFORMATION ====================
  development: {
    environment: "Testing mode with authentication bypass",
    features: {
      publicUpload: "All content uploads work without login",
      dummyUser: "All uploads assigned to 'guest_user'",
      chunkUpload: "Automatic chunking for large files",
      errorHandling: "Comprehensive error handling with retries"
    },
    deployment: {
      platform: "Koyeb",
      database: "MongoDB Atlas",
      cdn: "BunnyCDN",
      monitoring: "Health checks and logging enabled"
    }
  }
};

// ==================== AI SUPPORT RULES ====================
export const AI_SUPPORT_RULES = {
  // Strict rules for AI support behavior
  scope: {
    allowed: ["Kronop app features", "upload processes", "profile management", "troubleshooting", "error resolution"],
    forbidden: ["general knowledge", "non-Kronop topics", "external advice", "personal opinions"]
  },
  
  behavior: {
    tone: "Professional, helpful, friendly",
    language: "Match user's language (Hindi/English)",
    response: "Concise but comprehensive",
    empathy: "Show understanding for user issues"
  },
  
  contactInfo: {
    whenToProvide: "Only when user explicitly asks for contact information",
    whatToProvide: "Phone: 9039012335, Email: angoriyaarun311@gmail.com",
    howToProvide: "Professional manner with clear formatting"
  },
  
  escalation: {
    whenToEscalate: "Complex technical issues, account problems, payment issues",
    escalationMessage: "For this specific issue, I recommend contacting our technical team directly at..."
  }
};

// ==================== QUICK RESPONSES ====================
export const QUICK_RESPONSES = {
  profile: "📝 To update your profile: Go to Profile tab > Edit Profile > Update your info > Save Changes. You can change your name, bio, photos, and more!",
  
  upload: "📤 To upload content: Tap + button > Choose Reel/Video/Photo > Select file > Add details > Upload. Make sure your content follows our community guidelines!",
  
  settings: "⚙️ For settings: Go to Profile > Settings icon (top right) > Choose what you want to change. You can update privacy, notifications, and account preferences.",
  
  privacy: "🔒 Privacy settings help: Profile > Settings > Privacy > Choose who can see your content. You can set posts to private, control who can message you, and more.",
  
  support: "💜 Need more help? You can ask me for contact information and I'll provide it right away, or continue describing your issue and I'll help resolve it!",
  
  error: "🔧 I understand you're facing an issue. Let me help you troubleshoot step by step. Can you tell me more about what's happening?",
  
  login: "🔐 Currently, all features work without login during our testing phase. You can upload content and use all features freely!",
  
  uploadFailed: "📤 Upload failed? Let's fix this: 1) Check internet connection 2) Ensure file format is supported 3) Try again - system auto-handles large files with chunk upload",
  
  videoNotPlaying: "🎥 Video not playing? Try these steps: 1) Check internet connection 2) Wait for buffering 3) Restart app 4) Try different content"
};

export default KRONOP_KNOWLEDGE_BASE;
