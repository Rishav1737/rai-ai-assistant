# 🚀 RAI AI Assistant - Quick Start Guide

Get RAI up and running in under 5 minutes!

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud)

## 🎯 Quick Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd rai-ai-assistant

# Run the automated setup
node setup.js
```

The setup script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Create environment configuration
- ✅ Set up database connection
- ✅ Configure AI services

### 2. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies
npm run install-all

# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Start the Application

```bash
# Start both server and client
npm run dev
```

- **Server**: http://localhost:5000
- **Client**: http://localhost:3000

## 🔑 Required API Keys

To use RAI's AI features, you need API keys:

### OpenAI (Required for core features)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account and get your API key
3. Add to `.env`: `OPENAI_API_KEY=your_key_here`

### Google Gemini (Optional)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env`: `GEMINI_API_KEY=your_key_here`

### Anthropic (Optional)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add to `.env`: `ANTHROPIC_API_KEY=your_key_here`

## 🎮 First Steps

1. **Open** http://localhost:3000
2. **Register** a new account
3. **Start chatting** with RAI!

## 🧪 Test Commands

Try these commands to test RAI's capabilities:

### Basic Chat
```
Hello RAI! How are you today?
```

### Image Generation
```
Generate an image of a beautiful sunset over mountains
```

### Code Generation
```
Write a Python function to calculate fibonacci numbers
```

### Web Search
```
What's the latest news about AI technology?
```

### Voice Commands
```
Click the microphone icon and say: "Tell me a joke"
```

## 🛠️ Development

### Project Structure
```
rai-ai-assistant/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── uploads/               # File uploads
├── setup.js              # Setup script
└── README.md             # Full documentation
```

### Available Scripts
```bash
npm run dev          # Start development servers
npm run server       # Start server only
npm run client       # Start client only
npm run build        # Build for production
npm start            # Start production server
```

### Environment Variables
Key variables in `.env`:
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: Database connection
- `JWT_SECRET`: Authentication secret
- `OPENAI_API_KEY`: OpenAI API key
- `GEMINI_API_KEY`: Google Gemini API key

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Change port in .env
PORT=5001
```

**MongoDB connection failed**
```bash
# Start MongoDB
mongod

# Or use MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://...
```

**API key errors**
- Check your API keys in `.env`
- Ensure you have credits in your AI service accounts
- Verify the keys are correct and active

**Dependencies issues**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

- 📖 **Full Documentation**: README.md
- 🐛 **Report Issues**: GitHub Issues
- 💬 **Community**: GitHub Discussions

## 🚀 Production Deployment

### Quick Deploy to Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Deploy
heroku create your-rai-app
git push heroku main
```

### Docker Deployment
```bash
# Build and run with Docker
docker build -t rai-ai .
docker run -p 5000:5000 rai-ai
```

## 🎉 What's Next?

- 📚 Read the full [README.md](README.md)
- 🔧 Explore the [API Documentation](docs/api.md)
- 🎨 Customize the UI and AI personality
- 🔌 Add your own AI integrations
- 📱 Build mobile apps with the API

---

**RAI - The Future of AI Assistance** 🤖✨

Need help? Check the [full documentation](README.md) or [create an issue](https://github.com/your-repo/issues)! 