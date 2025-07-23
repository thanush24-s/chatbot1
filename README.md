# 🤖 AI Chatbot - Powered by Gemini Pro

A modern, feature-rich AI chatbot application built with React, TypeScript, Firebase, and Google's Gemini Pro AI. This application provides an intelligent conversational experience with a beautiful, user-friendly interface.

![AI Chatbot](https://img.shields.io/badge/AI-Gemini%20Pro-blue)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Firebase](https://img.shields.io/badge/Firebase-12.0.0-orange)

## ✨ Features

### 🎨 **Enhanced UI/UX**
- **Dark/Light Theme Toggle** - Switch between beautiful dark and light themes
- **Modern Design** - Glass morphism effects with smooth animations
- **Responsive Layout** - Optimized for desktop, tablet, and mobile devices
- **Toast Notifications** - Real-time feedback for user actions
- **Loading States** - Elegant loading animations and typing indicators

### 💬 **Chat Features**
- **Real-time Messaging** - Instant communication with AI assistant
- **Message History** - Persistent chat history stored in Firebase
- **Message Actions** - Copy messages to clipboard with one click
- **Clear Chat** - Easy option to clear all conversation history
- **Character Counter** - Visual feedback for message length (max 1000 characters)
- **Multi-line Support** - Use Shift+Enter for new lines

### 🔧 **Technical Features**
- **TypeScript** - Full type safety and better development experience
- **Firebase Integration** - Real-time database for message persistence
- **Error Handling** - Comprehensive error handling with user-friendly messages
- **Connection Status** - Visual indicator of backend connectivity
- **Service Worker** - Better performance and offline support
- **Accessibility** - ARIA labels and keyboard navigation support

### 📱 **Mobile Optimized**
- **Touch-friendly Interface** - Optimized for mobile interactions
- **Responsive Design** - Adapts to all screen sizes
- **iOS/Android Support** - Prevents zoom on input focus
- **PWA Ready** - Can be installed as a Progressive Web App

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Firebase Account** (for backend services)
- **Gemini Pro API Access** (for AI responses)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-react-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Copy your Firebase configuration
   - Update `src/firebase.js` with your config

4. **Set up Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Configure your Gemini Pro API key
   python backend.py
   ```

5. **Start the application**
   ```bash
   npm start
   ```

The app will open at [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Basic Chat
1. Type your message in the input field
2. Press **Enter** to send or **Shift+Enter** for new lines
3. Wait for the AI to respond
4. View your conversation history in real-time

### Theme Switching
- Click the **🌙/☀️** button in the header to toggle between dark and light themes
- Your theme preference is automatically saved

### Message Management
- **Copy Messages**: Click the 📋 icon on any message to copy it to clipboard
- **Clear Chat**: Click the 🗑️ icon in the header to clear all messages
- **View Timestamps**: Each message shows when it was sent

### Notifications
- Toast notifications appear for important actions (copy, clear, theme switch)
- Error messages are displayed when connection issues occur
- Success confirmations for completed actions

## 🏗️ Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Enhanced styling with theme support
├── firebase.js          # Firebase configuration
├── index.tsx           # Application entry point
└── index.css           # Global styles

public/
├── index.html          # Enhanced HTML template
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for performance
└── [assets]           # Icons and images

backend/
└── backend.py         # Python backend for Gemini Pro integration
```

## 🛠️ Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder with optimizations

### `npm run eject`
**⚠️ One-way operation!** Ejects from Create React App for full configuration control

## 🎨 Customization

### Theme Colors
Modify CSS custom properties in `src/App.css`:
```css
:root {
  --accent-color: #667eea;          /* Primary accent color */
  --success-color: #28a745;        /* Success messages */
  --error-color: #dc3545;          /* Error messages */
  --warning-color: #ffc107;        /* Warning messages */
}
```

### Firebase Configuration
Update `src/firebase.js` with your Firebase project settings:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};
```

## 🔧 Backend Setup

The backend requires Python with Flask and the Gemini Pro API:

1. **Install Python dependencies**
   ```bash
   pip install flask flask-cors google-generativeai python-dotenv
   ```

2. **Configure environment variables**
   ```bash
   # Create .env file in backend directory
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the backend server**
   ```bash
   python backend.py
   ```

## 📱 PWA Installation

This app can be installed as a Progressive Web App:

1. **Desktop**: Click the install button in your browser's address bar
2. **Mobile**: Use "Add to Home Screen" from your browser menu
3. **Features**: Works offline, app-like experience, push notifications ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Demo**: [Live Demo](your-demo-url)
- **Documentation**: [Full Docs](your-docs-url)
- **Issues**: [Report Issues](your-issues-url)
- **Firebase**: [Firebase Console](https://console.firebase.google.com/)
- **Gemini Pro**: [Google AI Studio](https://makersuite.google.com/)

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](your-issues-url) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Built with ❤️ using React, TypeScript, Firebase, and Gemini Pro**
