import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

// Components
import ChatSidebar from '../components/ChatSidebar';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import VoiceRecorder from '../components/VoiceRecorder';
import FileUpload from '../components/FileUpload';
import TypingIndicator from '../components/TypingIndicator';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useChat } from '../hooks/useChat';

// Services
import { chatService } from '../services/chatService';

// Utils
import { cn } from '../utils/cn';

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  
  // State
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Chat hook
  const { conversations, refreshConversations } = useChat();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation
  useEffect(() => {
    if (conversationId && user) {
      loadConversation();
    } else if (!conversationId && user) {
      // Create new conversation
      createNewConversation();
    }
  }, [conversationId, user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !connected) return;

    // Join user room
    socket.emit('join', user.id);

    // Listen for message responses
    socket.on('message_response', handleMessageResponse);
    
    // Listen for voice responses
    socket.on('voice_response', handleVoiceResponse);
    
    // Listen for typing indicators
    socket.on('user_typing', handleTypingIndicator);
    
    // Listen for errors
    socket.on('error', handleSocketError);

    return () => {
      socket.off('message_response');
      socket.off('voice_response');
      socket.off('user_typing');
      socket.off('error');
    };
  }, [socket, connected, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversationHistory(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const newConversation = await chatService.createConversation('New Conversation');
      navigate(`/chat/${newConversation.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleSendMessage = async (message, type = 'text') => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        userId: user.id,
        message: message.trim(),
        conversationId: conversationId,
        messageType: type
      };

      // Add user message to UI immediately
      const userMessage = {
        id: Date.now(),
        sender: 'user',
        content: message.trim(),
        messageType: type,
        timestamp: new Date(),
        status: 'sending'
      };

      setMessages(prev => [...prev, userMessage]);

      // Send via socket
      socket.emit('send_message', messageData);

      // Clear input
      if (inputRef.current) {
        inputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleMessageResponse = (response) => {
    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === response.userMessage.id 
          ? { ...msg, status: 'sent' }
          : msg
      );
      
      // Add AI response
      return [...updated, {
        id: response.aiMessage.id,
        sender: 'ai',
        content: response.aiMessage.content,
        messageType: response.aiMessage.type,
        metadata: response.aiMessage.metadata,
        timestamp: response.aiMessage.timestamp
      }];
    });

    // Update conversation
    if (response.conversation) {
      setConversation(response.conversation);
      refreshConversations();
    }
  };

  const handleVoiceResponse = (response) => {
    // Handle voice response similar to message response
    handleMessageResponse(response);
  };

  const handleTypingIndicator = (data) => {
    setIsTyping(data.isTyping);
  };

  const handleSocketError = (error) => {
    console.error('Socket error:', error);
    toast.error(error.message || 'Connection error');
  };

  const handleVoiceMessage = async (audioBlob) => {
    try {
      setVoiceRecording(false);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const audioData = reader.result.split(',')[1];
        
        const messageData = {
          userId: user.id,
          audioData,
          conversationId: conversationId
        };

        socket.emit('voice_message', messageData);
      };
      reader.readAsDataURL(audioBlob);

    } catch (error) {
      console.error('Error handling voice message:', error);
      toast.error('Failed to process voice message');
    }
  };

  const handleFileUpload = async (files) => {
    try {
      setFileUploading(true);
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);

        const uploadedFile = await chatService.uploadFile(formData);
        
        // Send file message
        const message = `Uploaded file: ${file.name}`;
        await handleSendMessage(message, 'file');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setFileUploading(false);
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && connected) {
      socket.emit('typing', {
        userId: user.id,
        conversationId: conversationId,
        isTyping
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {conversation?.title || 'New Conversation'} - RAI AI Assistant
        </title>
      </Helmet>

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <ChatSidebar
          conversations={conversations}
          currentConversationId={conversationId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onConversationSelect={(id) => {
            navigate(`/chat/${id}`);
            setSidebarOpen(false);
          }}
          onNewConversation={() => {
            navigate('/chat');
            setSidebarOpen(false);
          }}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <ChatHeader
            conversation={conversation}
            onMenuClick={() => setSidebarOpen(true)}
            onSettingsClick={() => navigate('/settings')}
          />

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageList
              messages={messages}
              isLoading={loading}
              onMessageReact={(messageId, reaction) => {
                // Handle message reactions
                console.log('Message reaction:', messageId, reaction);
              }}
            />
            
            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="px-4 py-2"
                >
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-4">
            <div className="flex items-end space-x-2">
              {/* File Upload */}
              <FileUpload
                onUpload={handleFileUpload}
                uploading={fileUploading}
                disabled={sending}
              />

              {/* Voice Recorder */}
              <VoiceRecorder
                onRecording={setVoiceRecording}
                onRecord={handleVoiceMessage}
                disabled={sending || voiceRecording}
              />

              {/* Message Input */}
              <div className="flex-1">
                <MessageInput
                  ref={inputRef}
                  onSend={handleSendMessage}
                  onTyping={handleTyping}
                  disabled={sending || voiceRecording}
                  placeholder="Type your message to RAI..."
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Press Enter to send</span>
                <span>Shift+Enter for new line</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>RAI is ready to help</span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connected ? "bg-green-500" : "bg-red-500"
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Chat; 