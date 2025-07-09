const OpenAI = require('openai');
const axios = require('axios');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  async generateTextResponse(message, history = [], user = null) {
    try {
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: `You are RAI (Revolutionary AI Assistant), a comprehensive AI that combines the best features from Gemini, Siri, ChatGPT, and other leading AI platforms. You are helpful, creative, and can assist with any task. You have access to real-time information, can generate code, create images, and much more. Always be friendly and professional.`
        }
      ];

      // Add conversation history
      history.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      // Try OpenAI first, fallback to other services
      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        });

        return {
          content: completion.choices[0].message.content,
          type: 'text',
          metadata: {
            model: 'gpt-4',
            provider: 'openai'
          }
        };
      } catch (openaiError) {
        console.log('OpenAI failed, trying Gemini...');
        return await this.generateWithGemini(message, history);
      }

    } catch (error) {
      console.error('Error generating text response:', error);
      throw error;
    }
  }

  async generateWithGemini(message, history = []) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`;
      
      const prompt = this.buildGeminiPrompt(message, history);
      
      const response = await axios.post(url, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      });

      const content = response.data.candidates[0].content.parts[0].text;
      
      return {
        content: content,
        type: 'text',
        metadata: {
          model: 'gemini-pro',
          provider: 'google'
        }
      };
    } catch (error) {
      console.error('Gemini failed:', error);
      // Fallback to simple response
      return {
        content: "I'm here to help! I can assist you with various tasks including text generation, code creation, image generation, and more. What would you like to work on?",
        type: 'text',
        metadata: {
          model: 'fallback',
          provider: 'rai'
        }
      };
    }
  }

  buildGeminiPrompt(message, history) {
    let prompt = `You are RAI (Revolutionary AI Assistant), a comprehensive AI that combines the best features from Gemini, Siri, ChatGPT, and other leading AI platforms. You are helpful, creative, and can assist with any task.\n\n`;
    
    if (history.length > 0) {
      prompt += `Previous conversation:\n`;
      history.forEach(msg => {
        prompt += `${msg.sender === 'user' ? 'User' : 'RAI'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `User: ${message}\nRAI:`;
    
    return prompt;
  }

  async generateImage(prompt) {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      return {
        content: response.data[0].url,
        type: 'image',
        metadata: {
          model: 'dall-e-3',
          provider: 'openai',
          prompt: prompt
        }
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  async generateCode(message) {
    try {
      const codePrompt = `Generate code based on the following request. Provide only the code with brief comments explaining key parts. If it's a complete application, provide all necessary files. Request: ${message}`;
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer. Generate clean, working code with appropriate comments. Always specify the programming language.'
          },
          {
            role: 'user',
            content: codePrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

      return {
        content: completion.choices[0].message.content,
        type: 'code',
        metadata: {
          model: 'gpt-4',
          provider: 'openai',
          language: this.detectLanguage(completion.choices[0].message.content)
        }
      };
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  detectLanguage(code) {
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes('function') && lowerCode.includes('const') && lowerCode.includes('=>')) return 'javascript';
    if (lowerCode.includes('def ') || lowerCode.includes('import ')) return 'python';
    if (lowerCode.includes('public class') || lowerCode.includes('public static')) return 'java';
    if (lowerCode.includes('#include') || lowerCode.includes('int main')) return 'cpp';
    if (lowerCode.includes('<?php')) return 'php';
    if (lowerCode.includes('html') || lowerCode.includes('<!DOCTYPE')) return 'html';
    if (lowerCode.includes('css') || lowerCode.includes('{') && lowerCode.includes(':')) return 'css';
    return 'unknown';
  }

  async webSearch(query) {
    try {
      // This would integrate with a search API like Google Custom Search
      // For now, we'll simulate a search response
      const searchResponse = await this.generateTextResponse(
        `Search for the latest information about: ${query}. Provide current and accurate information.`,
        [],
        null
      );

      return {
        content: searchResponse.content,
        type: 'search_result',
        metadata: {
          query: query,
          source: 'web_search',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error performing web search:', error);
      throw error;
    }
  }

  async speechToText(audioData) {
    try {
      // This would integrate with speech-to-text services
      // For now, we'll return a placeholder
      return "Speech-to-text conversion would happen here. Please provide your message in text format for now.";
    } catch (error) {
      console.error('Error converting speech to text:', error);
      throw error;
    }
  }

  async textToSpeech(text) {
    try {
      // This would integrate with text-to-speech services
      // For now, we'll return a placeholder
      return {
        audioUrl: null,
        text: text,
        metadata: {
          service: 'text-to-speech',
          status: 'not_implemented'
        }
      };
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw error;
    }
  }

  async processVoiceCommand(command) {
    try {
      const response = await this.generateTextResponse(
        `Process this voice command: ${command}. Provide a helpful response and suggest any actions that could be taken.`,
        [],
        null
      );

      return {
        content: response.content,
        type: 'voice_command',
        metadata: {
          originalCommand: command,
          processed: true
        }
      };
    } catch (error) {
      console.error('Error processing voice command:', error);
      throw error;
    }
  }

  async analyzeDocument(documentContent) {
    try {
      const analysisPrompt = `Analyze the following document and provide a comprehensive summary with key insights: ${documentContent}`;
      
      const response = await this.generateTextResponse(analysisPrompt, [], null);

      return {
        content: response.content,
        type: 'document_analysis',
        metadata: {
          documentLength: documentContent.length,
          analysisType: 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  async translateText(text, targetLanguage) {
    try {
      const translationPrompt = `Translate the following text to ${targetLanguage}: ${text}`;
      
      const response = await this.generateTextResponse(translationPrompt, [], null);

      return {
        content: response.content,
        type: 'translation',
        metadata: {
          originalText: text,
          targetLanguage: targetLanguage,
          sourceLanguage: 'auto-detected'
        }
      };
    } catch (error) {
      console.error('Error translating text:', error);
      throw error;
    }
  }

  async summarizeText(text) {
    try {
      const summaryPrompt = `Provide a concise summary of the following text: ${text}`;
      
      const response = await this.generateTextResponse(summaryPrompt, [], null);

      return {
        content: response.content,
        type: 'summary',
        metadata: {
          originalLength: text.length,
          summaryType: 'concise'
        }
      };
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw error;
    }
  }
}

module.exports = AIService; 