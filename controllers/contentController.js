const Content = require('../models/Content');

const getUserPhotos = async (req, res) => {
    try {
        
        const photos = await Content.find({ 
            type: 'Photo'
        }).sort({ created_at: -1 }).limit(100);

        res.json({ success: true, data: photos });
    } catch (error) {
        console.error('❌ Public getUserPhotos error:', error);
        res.status(500).json({ error: error.message });
    }
};

const saveUserPhoto = async (req, res) => {
    try {
        // BYPASS LOGIN: Use dummy user ID for testing
        const { userId, title, url, bunny_id, thumbnail, description, tags, category } = req.body;
        const effectiveUserId = userId || 'guest_user_' + Date.now();
        
        if (!url || !bunny_id) {
            return res.status(400).json({ error: 'url and bunny_id are required (userId optional for testing)' });
        }

        const newPhoto = new Content({
            user_id: effectiveUserId,
            type: 'Photo',
            title: title || 'Untitled Photo (NO LOGIN)',
            url,
            bunny_id,
            thumbnail,
            description,
            tags,
            category,
            is_active: true
        });

        await newPhoto.save();
        res.status(201).json({ success: true, data: newPhoto });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add missing getUserReels - NOW PUBLIC!
const getUserReels = async (req, res) => {
    try {
        
        const reels = await Content.find({ 
            type: 'Reel'
        }).sort({ created_at: -1 }).limit(100);

        res.json({ success: true, data: reels });
    } catch (error) {
        console.error('❌ Public getUserReels error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add missing getUserVideos - NOW PUBLIC!
const getUserVideos = async (req, res) => {
    try {
        
        const videos = await Content.find({ 
            type: 'Video'
        }).sort({ created_at: -1 }).limit(100);

        res.json({ success: true, data: videos });
    } catch (error) {
        console.error('❌ Public getUserVideos error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add missing getUserStories - NOW PUBLIC!
const getUserStories = async (req, res) => {
    try {
        
        const BunnyContentService = require('../services/bunnyContentService');
        const storyConfig = BunnyContentService.BUNNY_CONFIG.story;
        
        if (!storyConfig.apiKey || !storyConfig.libraryId) {
            console.error('❌ Missing BunnyCDN story configuration');
            return res.status(500).json({ error: 'BunnyCDN story configuration missing' });
        }

        // Fetch directly from BunnyCDN story library
        const bunnyStories = await BunnyContentService.fetchVideosFromBunny(
            storyConfig.libraryId, 
            storyConfig.apiKey
        );

        res.json({ success: true, data: bunnyStories });
    } catch (error) {
        console.error('❌ Public getUserStories error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add getUserShayariPhotos - PUBLIC!
const getUserShayariPhotos = async (req, res) => {
    try {
        
        const shayariPhotos = await Content.find({ 
            type: 'ShayariPhoto'
        }).sort({ created_at: -1 }).limit(100);

        res.json({ success: true, data: shayariPhotos });
    } catch (error) {
        console.error('❌ Public getUserShayariPhotos error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getUserPhotos,
    saveUserPhoto,
    getUserReels,
    getUserVideos,
    getUserStories,
    getUserShayariPhotos
};
