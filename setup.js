#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🤖 RAI AI Assistant Setup
==========================

Welcome to RAI - Revolutionary AI Assistant!
This script will help you set up your AI assistant with all necessary configurations.

`);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');
  
  // Check Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      log('❌ Node.js version 16 or higher is required', 'red');
      log(`Current version: ${nodeVersion}`, 'yellow');
      return false;
    }
    log(`✅ Node.js ${nodeVersion}`, 'green');
  } catch (error) {
    log('❌ Node.js is not installed', 'red');
    return false;
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✅ npm ${npmVersion}`, 'green');
  } catch (error) {
    log('❌ npm is not installed', 'red');
    return false;
  }

  // Check MongoDB
  try {
    execSync('mongod --version', { encoding: 'utf8' });
    log('✅ MongoDB is installed', 'green');
  } catch (error) {
    log('⚠️  MongoDB is not installed or not in PATH', 'yellow');
    log('   You can install MongoDB from: https://docs.mongodb.com/manual/installation/', 'blue');
  }

  return true;
}

async function createEnvironmentFile() {
  log('\n📝 Creating environment configuration...', 'cyan');
  
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('Environment file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log('Skipping environment file creation', 'yellow');
      return;
    }
  }

  log('\nPlease provide the following configuration values:');
  log('(Press Enter to use default values)\n', 'blue');

  const config = {
    PORT: await question('Server port (default: 5000): ') || '5000',
    NODE_ENV: await question('Environment (default: development): ') || 'development',
    CLIENT_URL: await question('Client URL (default: http://localhost:3000): ') || 'http://localhost:3000',
    MONGODB_URI: await question('MongoDB URI (default: mongodb://localhost:27017/rai-ai): ') || 'mongodb://localhost:27017/rai-ai',
    JWT_SECRET: await question('JWT Secret (generate a strong secret): ') || generateJWTSecret(),
    OPENAI_API_KEY: await question('OpenAI API Key (optional): ') || '',
    GEMINI_API_KEY: await question('Google Gemini API Key (optional): ') || '',
    ANTHROPIC_API_KEY: await question('Anthropic API Key (optional): ') || '',
    MAX_FILE_SIZE: await question('Max file size in bytes (default: 10485760): ') || '10485760',
    UPLOAD_PATH: await question('Upload path (default: ./uploads): ') || './uploads',
    RATE_LIMIT_WINDOW: await question('Rate limit window in ms (default: 900000): ') || '900000',
    RATE_LIMIT_MAX: await question('Rate limit max requests (default: 100): ') || '100'
  };

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ Environment file created successfully', 'green');
}

function generateJWTSecret() {
  return require('crypto').randomBytes(64).toString('hex');
}

async function installDependencies() {
  log('\n📦 Installing dependencies...', 'cyan');
  
  try {
    log('Installing server dependencies...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    
    log('Installing client dependencies...', 'blue');
    execSync('cd client && npm install', { stdio: 'inherit' });
    
    log('✅ Dependencies installed successfully', 'green');
  } catch (error) {
    log('❌ Error installing dependencies', 'red');
    log(error.message, 'red');
    return false;
  }
  
  return true;
}

async function createDirectories() {
  log('\n📁 Creating necessary directories...', 'cyan');
  
  const directories = [
    'uploads',
    'logs',
    'client/src/components',
    'client/src/pages',
    'client/src/hooks',
    'client/src/services',
    'client/src/utils',
    'server/controllers',
    'server/models',
    'server/routes',
    'server/middleware',
    'server/services',
    'server/utils'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log(`✅ Created directory: ${dir}`, 'green');
    }
  });
}

async function setupDatabase() {
  log('\n🗄️  Database setup...', 'cyan');
  
  const setupMongo = await question('Would you like to set up MongoDB connection? (Y/n): ');
  if (setupMongo.toLowerCase() === 'n') {
    log('Skipping database setup', 'yellow');
    return;
  }

  log('Make sure MongoDB is running on your system', 'blue');
  log('You can start MongoDB with: mongod', 'blue');
  
  const testConnection = await question('Test database connection? (Y/n): ');
  if (testConnection.toLowerCase() !== 'n') {
    // This would test the MongoDB connection
    log('Database connection test would be implemented here', 'yellow');
  }
}

async function setupAIKeys() {
  log('\n🤖 AI Service Configuration...', 'cyan');
  
  log('To use RAI\'s AI features, you need API keys from:', 'blue');
  log('• OpenAI (https://platform.openai.com/api-keys)', 'blue');
  log('• Google Gemini (https://makersuite.google.com/app/apikey)', 'blue');
  log('• Anthropic (https://console.anthropic.com/)', 'blue');
  
  const setupAI = await question('Would you like to configure AI keys now? (Y/n): ');
  if (setupAI.toLowerCase() === 'n') {
    log('You can configure AI keys later in the .env file', 'yellow');
    return;
  }

  // This would update the .env file with new keys
  log('AI key configuration would be implemented here', 'yellow');
}

async function startServices() {
  log('\n🚀 Starting services...', 'cyan');
  
  const startNow = await question('Would you like to start the development servers now? (Y/n): ');
  if (startNow.toLowerCase() === 'n') {
    log('You can start the servers later with: npm run dev', 'yellow');
    return;
  }

  log('Starting development servers...', 'blue');
  log('Server will be available at: http://localhost:5000', 'green');
  log('Client will be available at: http://localhost:3000', 'green');
  log('Press Ctrl+C to stop the servers', 'yellow');
  
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    log('Error starting servers', 'red');
  }
}

async function main() {
  try {
    log('🤖 RAI AI Assistant Setup', 'magenta');
    log('==========================', 'magenta');

    // Check prerequisites
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      log('\n❌ Prerequisites not met. Please install required software.', 'red');
      process.exit(1);
    }

    // Create directories
    await createDirectories();

    // Create environment file
    await createEnvironmentFile();

    // Install dependencies
    const depsOk = await installDependencies();
    if (!depsOk) {
      log('\n❌ Failed to install dependencies.', 'red');
      process.exit(1);
    }

    // Setup database
    await setupDatabase();

    // Setup AI keys
    await setupAIKeys();

    // Final instructions
    log('\n🎉 Setup completed successfully!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Start MongoDB: mongod', 'blue');
    log('2. Start development servers: npm run dev', 'blue');
    log('3. Open http://localhost:3000 in your browser', 'blue');
    log('4. Register a new account and start chatting with RAI!', 'blue');
    
    log('\n📚 Documentation:', 'cyan');
    log('• README.md - Complete setup and usage guide', 'blue');
    log('• API Documentation - Available at /api/docs when server is running', 'blue');
    
    log('\n🆘 Support:', 'cyan');
    log('• GitHub Issues: Report bugs and request features', 'blue');
    log('• Documentation: Check README.md for detailed guides', 'blue');

    // Start services if requested
    await startServices();

  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
if (require.main === module) {
  main();
}

module.exports = { main }; 