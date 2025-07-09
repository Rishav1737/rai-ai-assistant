const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    aiPersonality: {
      type: String,
      enum: ['friendly', 'professional', 'creative', 'technical'],
      default: 'friendly'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    features: [{
      type: String
    }]
  },
  usage: {
    messagesSent: {
      type: Number,
      default: 0
    },
    imagesGenerated: {
      type: Number,
      default: 0
    },
    codeGenerated: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'usage.lastActive': -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    preferences: this.preferences,
    subscription: {
      plan: this.subscription.plan,
      features: this.subscription.features
    },
    usage: this.usage,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

// Method to update usage statistics
userSchema.methods.updateUsage = function(type, count = 1) {
  switch (type) {
    case 'message':
      this.usage.messagesSent += count;
      break;
    case 'image':
      this.usage.imagesGenerated += count;
      break;
    case 'code':
      this.usage.codeGenerated += count;
      break;
  }
  this.usage.lastActive = new Date();
  return this.save();
};

// Method to check subscription limits
userSchema.methods.checkLimits = function(type) {
  const limits = {
    free: { messages: 100, images: 10, code: 50 },
    basic: { messages: 1000, images: 100, code: 500 },
    premium: { messages: 10000, images: 1000, code: 5000 },
    enterprise: { messages: -1, images: -1, code: -1 } // Unlimited
  };

  const plan = this.subscription.plan;
  const limit = limits[plan][type];
  
  if (limit === -1) return true; // Unlimited
  
  const current = this.usage[`${type}sSent`] || this.usage[`${type}sGenerated`] || this.usage[`${type}sGenerated`];
  return current < limit;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema); 