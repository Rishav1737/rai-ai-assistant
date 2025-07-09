const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'code', 'voice', 'file', 'system'],
    default: 'text'
  },
  metadata: {
    // AI-specific metadata
    model: String,
    provider: String,
    tokens: Number,
    responseTime: Number,
    intent: String,
    confidence: Number,
    
    // Image-specific metadata
    imageUrl: String,
    imagePrompt: String,
    imageSize: String,
    
    // Code-specific metadata
    language: String,
    syntaxHighlighting: String,
    executionResult: String,
    
    // Voice-specific metadata
    audioUrl: String,
    duration: Number,
    transcribedText: String,
    
    // File-specific metadata
    fileName: String,
    fileSize: Number,
    fileType: String,
    downloadUrl: String,
    
    // General metadata
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [{
      content: String,
      editedAt: Date
    }],
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    mentions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String
    }],
    links: [{
      url: String,
      title: String,
      description: String,
      image: String
    }],
    attachments: [{
      type: String,
      url: String,
      name: String,
      size: Number
    }]
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ 'metadata.model': 1 });
messageSchema.index({ createdAt: -1 });

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Update conversation message count
  if (this.isNew) {
    const Conversation = mongoose.model('Conversation');
    Conversation.findByIdAndUpdate(
      this.conversationId,
      { $inc: { messageCount: 1 } }
    ).exec();
  }
  next();
});

// Method to add reaction
messageSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from this user
  this.metadata.reactions = this.metadata.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.metadata.reactions.push({
    userId,
    type: reactionType,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.metadata.reactions = this.metadata.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Method to edit message
messageSchema.methods.edit = function(newContent) {
  // Save current content to edit history
  if (!this.metadata.editHistory) {
    this.metadata.editHistory = [];
  }
  
  this.metadata.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  
  // Update content
  this.content = newContent;
  this.metadata.isEdited = true;
  
  return this.save();
};

// Method to soft delete message
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to restore message
messageSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Method to add mention
messageSchema.methods.addMention = function(userId, username) {
  if (!this.metadata.mentions) {
    this.metadata.mentions = [];
  }
  
  const existingMention = this.metadata.mentions.find(
    m => m.userId.toString() === userId.toString()
  );
  
  if (!existingMention) {
    this.metadata.mentions.push({
      userId,
      username
    });
  }
  
  return this.save();
};

// Method to add attachment
messageSchema.methods.addAttachment = function(attachment) {
  if (!this.metadata.attachments) {
    this.metadata.attachments = [];
  }
  
  this.metadata.attachments.push(attachment);
  return this.save();
};

// Method to get message summary
messageSchema.methods.getSummary = function() {
  return {
    id: this._id,
    sender: this.sender,
    content: this.isDeleted ? '[Message deleted]' : this.content,
    messageType: this.messageType,
    timestamp: this.timestamp,
    isDeleted: this.isDeleted,
    reactions: this.metadata.reactions || [],
    mentions: this.metadata.mentions || []
  };
};

// Static method to find messages by conversation
messageSchema.statics.findByConversation = function(conversationId, options = {}) {
  const query = { 
    conversationId,
    isDeleted: false
  };
  
  return this.find(query)
    .sort({ timestamp: options.sort === 'desc' ? -1 : 1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .populate('metadata.reactions.userId', 'username avatar')
    .populate('metadata.mentions.userId', 'username avatar');
};

// Static method to search messages
messageSchema.statics.search = function(conversationId, searchTerm) {
  return this.find({
    conversationId,
    isDeleted: false,
    content: { $regex: searchTerm, $options: 'i' }
  }).sort({ timestamp: -1 });
};

// Static method to get message statistics
messageSchema.statics.getStats = function(conversationId) {
  return this.aggregate([
    { $match: { conversationId: mongoose.Types.ObjectId(conversationId) } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        userMessages: {
          $sum: { $cond: [{ $eq: ['$sender', 'user'] }, 1, 0] }
        },
        aiMessages: {
          $sum: { $cond: [{ $eq: ['$sender', 'ai'] }, 1, 0] }
        },
        averageResponseTime: { $avg: '$metadata.responseTime' },
        totalTokens: { $sum: '$metadata.tokens' }
      }
    }
  ]);
};

// Static method to find messages by type
messageSchema.statics.findByType = function(conversationId, messageType) {
  return this.find({
    conversationId,
    messageType,
    isDeleted: false
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('Message', messageSchema); 