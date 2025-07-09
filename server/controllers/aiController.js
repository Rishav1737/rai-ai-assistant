const AIService = require('../services/aiService');
const aiService = new AIService();

exports.generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const result = await aiService.generateImage(prompt);
    res.json(result);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image.' });
  }
};

// Placeholder for other AI endpoints
exports.generateText = async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
};
exports.generateCode = async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
};
exports.processVoice = async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
}; 