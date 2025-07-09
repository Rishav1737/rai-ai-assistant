const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  lastMessage: {
    type: String,
    trim: true,
    maxlength: 500
  },
  messageCount: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  metadata: {
    aiModel: {
      type: String,
      default: 'gpt-4'
    },
    language: {
      type: String,
      default: 'en'
    },
    topic: {
      type: String,
      trim: true
    },
    complexity: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    }
  },
  settings: {
    autoSave: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    sharing: {
      type: Boolean,
      default: false
    }
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  analytics: {
    totalTokens: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    userSatisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    mostUsedFeatures: [{
      feature: String,
      count: Number
    }]
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, isArchived: 1 });
conversationSchema.index({ userId: 1, isPinned: 1 });
conversationSchema.index({ 'sharedWith.userId': 1 });

// Pre-save middleware to update message count
conversationSchema.pre('save', function(next) {
  if (this.isModified('messageCount')) {
    this.updatedAt = new Date();
  }
  next();
});

// Method to increment message count
conversationSchema.methods.incrementMessageCount = function() {
  this.messageCount += 1;
  return this.save();
};

// Method to add tag
conversationSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

// Method to remove tag
conversationSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Method to share conversation
conversationSchema.methods.shareWith = function(userId, permission = 'read') {
  const existingShare = this.sharedWith.find(share => share.userId.toString() === userId);
  
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    this.sharedWith.push({
      userId,
      permission,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove share
conversationSchema.methods.removeShare = function(userId) {
  this.sharedWith = this.sharedWith.filter(share => share.userId.toString() !== userId);
  return this.save();
};

// Method to check if user has access
conversationSchema.methods.hasAccess = function(userId, requiredPermission = 'read') {
  // Owner always has access
  if (this.userId.toString() === userId) {
    return true;
  }
  
  // Check shared access
  const share = this.sharedWith.find(s => s.userId.toString() === userId);
  if (!share) return false;
  
  const permissions = ['read', 'write', 'admin'];
  const userPermission = permissions.indexOf(share.permission);
  const requiredLevel = permissions.indexOf(requiredPermission);
  
  return userPermission >= requiredLevel;
};

// Method to get conversation summary
conversationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    lastMessage: this.lastMessage,
    messageCount: this.messageCount,
    isArchived: this.isArchived,
    isPinned: this.isPinned,
    tags: this.tags,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find conversations by user
conversationSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.archived !== undefined) {
    query.isArchived = options.archived;
  }
  
  if (options.pinned !== undefined) {
    query.isPinned = options.pinned;
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to find shared conversations
conversationSchema.statics.findSharedWith = function(userId) {
  return this.find({
    'sharedWith.userId': userId
  }).populate('userId', 'username firstName lastName avatar');
};

// Static method to search conversations
conversationSchema.statics.search = function(userId, searchTerm) {
  return this.find({
    userId,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { lastMessage: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Conversation', conversationSchema); 