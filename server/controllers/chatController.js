const AIService = require('../services/aiService');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

class ChatController {
  constructor(io) {
    this.io = io;
    this.aiService = new AIService();
  }

  async handleMessage(socket, data) {
    try {
      const { userId, message, conversationId, messageType = 'text' } = data;

      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.userId.toString() !== userId) {
          throw new Error('Conversation not found or access denied');
        }
      } else {
        conversation = new Conversation({
          userId,
          title: message.substring(0, 50) + '...',
          createdAt: new Date()
        });
        await conversation.save();
      }

      // Save user message
      const userMessage = new Message({
        conversationId: conversation._id,
        sender: 'user',
        content: message,
        messageType,
        timestamp: new Date()
      });
      await userMessage.save();

      // Update conversation
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
      await conversation.save();

      // Generate AI response
      const aiResponse = await this.generateAIResponse(message, conversation._id, user);

      // Save AI response
      const aiMessage = new Message({
        conversationId: conversation._id,
        sender: 'ai',
        content: aiResponse.content,
        messageType: aiResponse.type || 'text',
        metadata: aiResponse.metadata || {},
        timestamp: new Date()
      });
      await aiMessage.save();

      // Update conversation with AI response
      conversation.lastMessage = aiResponse.content;
      conversation.updatedAt = new Date();
      await conversation.save();

      // Emit response to user
      const response = {
        conversationId: conversation._id,
        userMessage: {
          id: userMessage._id,
          content: message,
          type: messageType,
          timestamp: userMessage.timestamp
        },
        aiMessage: {
          id: aiMessage._id,
          content: aiResponse.content,
          type: aiResponse.type || 'text',
          metadata: aiResponse.metadata || {},
          timestamp: aiMessage.timestamp
        },
        conversation: {
          id: conversation._id,
          title: conversation.title,
          updatedAt: conversation.updatedAt
        }
      };

      return response;

    } catch (error) {
      console.error('Error handling message:', error);
      throw error;
    }
  }

  async handleVoiceMessage(socket, data) {
    try {
      const { userId, audioData, conversationId } = data;

      // Convert speech to text
      const transcribedText = await this.aiService.speechToText(audioData);

      // Handle as regular message
      const messageData = {
        userId,
        message: transcribedText,
        conversationId,
        messageType: 'voice'
      };

      const response = await this.handleMessage(socket, messageData);

      // Add voice-specific metadata
      response.userMessage.originalAudio = audioData;
      response.userMessage.transcribedText = transcribedText;

      return response;

    } catch (error) {
      console.error('Error handling voice message:', error);
      throw error;
    }
  }

  async generateAIResponse(message, conversationId, user) {
    try {
      // Get conversation history for context
      const history = await Message.find({ conversationId })
        .sort({ timestamp: 1 })
        .limit(10)
        .select('content sender messageType');

      // Analyze message intent
      const intent = await this.analyzeIntent(message);

      // Route to appropriate AI service based on intent
      let response;
      switch (intent.type) {
        case 'image_generation':
          response = await this.aiService.generateImage(message);
          break;
        case 'code_generation':
          response = await this.aiService.generateCode(message);
          break;
        case 'web_search':
          response = await this.aiService.webSearch(message);
          break;
        case 'document_analysis':
          response = await this.aiService.analyzeDocument(message);
          break;
        case 'voice_command':
          response = await this.aiService.processVoiceCommand(message);
          break;
        default:
          response = await this.aiService.generateTextResponse(message, history, user);
      }

      return {
        content: response.content,
        type: response.type || 'text',
        metadata: {
          intent: intent.type,
          confidence: intent.confidence,
          ...response.metadata
        }
      };

    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        type: 'text',
        metadata: { error: true }
      };
    }
  }

  async analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Image generation patterns
    if (lowerMessage.includes('generate') && (lowerMessage.includes('image') || lowerMessage.includes('picture'))) {
      return { type: 'image_generation', confidence: 0.9 };
    }
    if (lowerMessage.includes('create') && (lowerMessage.includes('image') || lowerMessage.includes('picture'))) {
      return { type: 'image_generation', confidence: 0.9 };
    }

    // Code generation patterns
    if (lowerMessage.includes('code') || lowerMessage.includes('program') || lowerMessage.includes('function')) {
      return { type: 'code_generation', confidence: 0.8 };
    }
    if (lowerMessage.includes('write') && (lowerMessage.includes('code') || lowerMessage.includes('script'))) {
      return { type: 'code_generation', confidence: 0.9 };
    }

    // Web search patterns
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('latest')) {
      return { type: 'web_search', confidence: 0.7 };
    }

    // Voice command patterns
    if (lowerMessage.includes('voice') || lowerMessage.includes('speak') || lowerMessage.includes('audio')) {
      return { type: 'voice_command', confidence: 0.8 };
    }

    // Document analysis patterns
    if (lowerMessage.includes('analyze') || lowerMessage.includes('document') || lowerMessage.includes('file')) {
      return { type: 'document_analysis', confidence: 0.7 };
    }

    // Default to text response
    return { type: 'text_response', confidence: 0.9 };
  }

  async getConversationHistory(userId, conversationId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages = await Message.find({ conversationId })
        .sort({ timestamp: 1 })
        .select('content sender messageType metadata timestamp');

      return {
        conversation,
        messages
      };

    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async getUserConversations(userId) {
    try {
      const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 })
        .select('title lastMessage createdAt updatedAt');

      return conversations;

    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  async deleteConversation(userId, conversationId) {
    try {
      const conversation = await Conversation.findOneAndDelete({
        _id: conversationId,
        userId
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Delete all messages in the conversation
      await Message.deleteMany({ conversationId });

      return { success: true };

    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

module.exports = ChatController; 