const mongoose = require('mongoose');

const userInterestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  interests: [{
    category: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 10
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    interactionCount: {
      type: Number,
      default: 0
    }
  }],
  totalInteractions: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to update user interests
userInterestSchema.statics.updateUserInterests = async function(userId, contentType, tags, category, interactionType) {
  try {
    const interactionWeights = {
      'view': 1,
      'long_view': 3,
      'like': 2,
      'share': 4,
      'comment': 3,
      'save': 5
    };

    const weight = interactionWeights[interactionType] || 1;
    
    let userInterests = await this.findOne({ userId });
    
    if (!userInterests) {
      userInterests = new this({ 
        userId, 
        interests: [],
        totalInteractions: 0
      });
    }

    // Update content type interest
    await this._updateInterestCategory(userInterests, contentType, weight);
    
    // Update category interest
    if (category) {
      await this._updateInterestCategory(userInterests, category, weight);
    }
    
    // Update tag interests
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        await this._updateInterestCategory(userInterests, tag, weight);
      }
    }

    userInterests.totalInteractions += 1;
    userInterests.updatedAt = new Date();
    
    await userInterests.save();
    return userInterests;
    
  } catch (error) {
    console.error('Error updating user interests:', error);
    throw error;
  }
};

// Helper method to update individual interest category
userInterestSchema.statics._updateInterestCategory = async function(userInterests, category, weight) {
  const existingInterest = userInterests.interests.find(i => i.category === category);
  
  if (existingInterest) {
    existingInterest.weight = Math.min(10, existingInterest.weight + weight * 0.1);
    existingInterest.interactionCount += 1;
    existingInterest.lastUpdated = new Date();
  } else {
    userInterests.interests.push({
      category,
      weight: Math.min(10, weight),
      interactionCount: 1,
      lastUpdated: new Date()
    });
  }
};

// Static method to get weighted categories
userInterestSchema.statics.getWeightedCategories = async function(userId) {
  const userInterests = await this.findOne({ userId });
  if (!userInterests) return [];
  
  return userInterests.interests
    .sort((a, b) => b.weight - a.weight)
    .map(interest => ({
      category: interest.category,
      weight: interest.weight,
      interactionCount: interest.interactionCount
    }));
};

// Static method to get top interests
userInterestSchema.statics.getTopInterests = async function(userId, limit = 10) {
  const userInterests = await this.findOne({ userId });
  if (!userInterests) return [];
  
  return userInterests.interests
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(interest => ({
      category: interest.category,
      weight: interest.weight,
      interactionCount: interest.interactionCount
    }));
};

module.exports = mongoose.model('UserInterests', userInterestSchema);
