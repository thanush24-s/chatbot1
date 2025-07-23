import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

// Define message type
interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp?: Date;
  reactions?: string[];
  isTyping?: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  // State to store all messages
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State for current input
  const [input, setInput] = useState<string>('');
  
  // State to track if AI is responding
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Counter for unique message IDs
  const [messageCounter, setMessageCounter] = useState<number>(1);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Connection status
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Error state
  const [error, setError] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState<number>(1);

  // New attractive features
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showParticles, setShowParticles] = useState<boolean>(true);
  const [messageFilter, setMessageFilter] = useState<'all' | 'user' | 'ai'>('all');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showTypingSimulation, setShowTypingSimulation] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Voice recognition
  const [recognition, setRecognition] = useState<any>(null);

  // Reference for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionInstance.onerror = () => {
        setIsRecording(false);
        showToast('Voice recognition failed', 'error');
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, autoScroll]);

  // Load chat history from Firebase when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatbot-theme');
    const savedSettings = localStorage.getItem('chatbot-settings');
    
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setShowParticles(settings.showParticles ?? true);
      setAutoScroll(settings.autoScroll ?? true);
      setShowTypingSimulation(settings.showTypingSimulation ?? true);
      setSoundEnabled(settings.soundEnabled ?? true);
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
    localStorage.setItem('chatbot-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Save settings
  useEffect(() => {
    const settings = {
      showParticles,
      autoScroll,
      showTypingSimulation,
      soundEnabled
    };
    localStorage.setItem('chatbot-settings', JSON.stringify(settings));
  }, [showParticles, autoScroll, showTypingSimulation, soundEnabled]);

  // Function to load chat history from Firebase
  const loadChatHistory = () => {
    const messagesRef = collection(db, 'chats', 'default-chat', 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedMessages: Message[] = [];
        let counter = 1;
        
        // Add welcome message if no messages exist
        if (snapshot.empty) {
          loadedMessages.push({
            id: counter++,
            text: "👋 Hello! I'm your AI assistant powered by Gemini Pro. I'm here to help you with anything you need! ✨",
            isUser: false,
            timestamp: new Date()
          });
        } else {
          snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            loadedMessages.push({
              id: counter++,
              text: data.text,
              isUser: data.isUser,
              timestamp: data.timestamp?.toDate() || new Date(),
              reactions: data.reactions || []
            });
          });
        }
        
        setMessages(loadedMessages);
        setMessageCounter(counter);
        setIsConnected(true);
        setError('');
      },
      (error) => {
        console.error('Error loading chat history:', error);
        setIsConnected(false);
        setError('Failed to load chat history. Please check your connection.');
      }
    );

    return unsubscribe;
  };

  // Function to save message to Firebase
  const saveMessageToFirebase = async (text: string, isUser: boolean): Promise<void> => {
    try {
      const messagesRef = collection(db, 'chats', 'default-chat', 'messages');
      await addDoc(messagesRef, {
        text: text,
        isUser: isUser,
        timestamp: Timestamp.fromDate(new Date()),
        reactions: []
      });
      console.log('✅ Message saved to Firebase');
      setError('');
    } catch (error) {
      console.error('❌ Error saving message to Firebase:', error);
      setError('Failed to save message. Please try again.');
    }
  };

  // Play sound effect
  const playSound = (type: 'send' | 'receive' | 'notification') => {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = { send: 800, receive: 600, notification: 1000 };
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // Simulate typing effect for AI responses
  const simulateTyping = async (text: string): Promise<void> => {
    if (!showTypingSimulation) {
      await saveMessageToFirebase(text, false);
      return;
    }

    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      
      // Update the last message with current progress
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.isTyping) {
          lastMessage.text = currentText + '|';
        }
        return newMessages;
      });
      
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
    }
    
    // Remove typing indicator and save final message
    setMessages(prev => prev.filter(msg => !msg.isTyping));
    await saveMessageToFirebase(text, false);
  };

  // Function to send message
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return; // Don't send empty messages
    
    const currentInput = input; // Store input before clearing
    setInput(''); // Clear input immediately
    setIsLoading(true); // Show loading
    setError(''); // Clear any previous errors

    // Play send sound
    playSound('send');

    // Save user message to Firebase
    await saveMessageToFirebase(currentInput, true);
    
    try {
      // Add typing indicator for AI
      if (showTypingSimulation) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: 'AI is thinking...',
          isUser: false,
          timestamp: new Date(),
          isTyping: true
        }]);
      }

      // Send to backend
      const response = await axios.post('http://localhost:8000/chat', {
        message: currentInput
      }, {
        timeout: 30000 // 30 second timeout
      });
      
      // Play receive sound
      playSound('receive');
      
      // Simulate typing for AI response
      await simulateTyping(response.data.response);
      
    } catch (error) {
      // Remove typing indicator if it exists
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      
      // Handle error
      let errorMessage = "⚠️ Sorry, I couldn't connect to the AI service.";
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = "🔌 Backend server is not running. Please start the server and try again.";
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = "⏱️ Request timed out. The AI might be busy, please try again.";
        }
      }
      
      await saveMessageToFirebase(errorMessage, false);
      setError(errorMessage);
    }
    
    setIsLoading(false); // Hide loading
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
    const newToast: Toast = {
      id: toastCounter,
      message,
      type
    };
    
    setToasts(prev => [...prev, newToast]);
    setToastCounter(prev => prev + 1);
    
    playSound('notification');
    
    // Auto remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 3000);
  };

  // Remove toast manually
  const removeToast = (id: number): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Copy message to clipboard
  const copyMessage = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Message copied to clipboard! 📋', 'success');
    } catch (error) {
      console.error('Failed to copy message:', error);
      showToast('Failed to copy message', 'error');
    }
  };

  // Voice input
  const startVoiceInput = (): void => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      recognition.start();
    }
  };

  // Export chat
  const exportChat = (): void => {
    const chatData = messages.map(msg => ({
      timestamp: msg.timestamp?.toISOString(),
      sender: msg.isUser ? 'You' : 'AI',
      message: msg.text
    }));
    
    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Chat exported successfully! 📁', 'success');
  };

  // Clear all chat messages
  const clearChat = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
      try {
        const messagesRef = collection(db, 'chats', 'default-chat', 'messages');
        const snapshot = await getDocs(messagesRef);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        setMessages([]);
        setMessageCounter(1);
        showToast('Chat cleared successfully! 🗑️', 'success');
      } catch (error) {
        console.error('Error clearing chat:', error);
        setError('Failed to clear chat. Please try again.');
        showToast('Failed to clear chat', 'error');
      }
    }
  };

  // Toggle theme
  const toggleTheme = (): void => {
    setIsDarkMode(!isDarkMode);
    showToast(`Switched to ${!isDarkMode ? 'dark' : 'light'} mode! ${!isDarkMode ? '🌙' : '☀️'}`, 'info');
  };

  // Toggle fullscreen
  const toggleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Search messages
  const filteredMessages = messages.filter(message => {
    const matchesSearch = searchQuery === '' || 
      message.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = messageFilter === 'all' || 
      (messageFilter === 'user' && message.isUser) ||
      (messageFilter === 'ai' && !message.isUser);
    
    return matchesSearch && matchesFilter && !message.isTyping;
  });

  // Get character count info
  const getCharacterInfo = () => {
    const maxLength = 1000;
    const currentLength = input.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    return { currentLength, maxLength, isNearLimit };
  };

  const characterInfo = getCharacterInfo();

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Floating particles background */}
      {showParticles && (
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i % 4}`}></div>
          ))}
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <span className="toast-icon">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button 
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="ai-avatar-header">
              <div className="avatar-glow"></div>
              🤖
            </div>
            <div className="header-text">
              <h1>
                <span className="gradient-text">AI Chatbot Pro</span>
                <div className="sparkle sparkle-1">✨</div>
                <div className="sparkle sparkle-2">⭐</div>
              </h1>
              <p className="header-subtitle">
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                Powered by Gemini Pro + Firebase
                <span className="pulse-dot"></span>
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className={`header-btn ${showSearch ? 'active' : ''}`}
              onClick={() => setShowSearch(!showSearch)}
              title="Search Messages"
              aria-label="Search messages"
            >
              🔍
            </button>
            <button 
              className="header-btn"
              onClick={exportChat}
              title="Export Chat"
              aria-label="Export chat history"
            >
              📁
            </button>
            <button 
              className="header-btn"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              aria-label="Toggle fullscreen mode"
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>
            <button 
              className="header-btn"
              onClick={clearChat}
              title="Clear Chat"
              aria-label="Clear all messages"
            >
              🗑️
            </button>
            <button 
              className={`header-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
              aria-label="Open settings"
            >
              ⚙️
            </button>
            <button 
              className="header-btn theme-toggle"
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="search-container">
            <div className="search-wrapper">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="search-input"
              />
              <select
                value={messageFilter}
                onChange={(e) => setMessageFilter(e.target.value as 'all' | 'user' | 'ai')}
                className="filter-select"
              >
                <option value="all">All Messages</option>
                <option value="user">Your Messages</option>
                <option value="ai">AI Messages</option>
              </select>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-grid">
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={showParticles}
                  onChange={(e) => setShowParticles(e.target.checked)}
                />
                <span>Floating Particles ✨</span>
              </label>
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                <span>Auto Scroll 📜</span>
              </label>
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={showTypingSimulation}
                  onChange={(e) => setShowTypingSimulation(e.target.checked)}
                />
                <span>Typing Animation ⌨️</span>
              </label>
              <label className="setting-item">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span>Sound Effects 🔊</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="error-close">✕</button>
        </div>
      )}

      {/* Chat Container */}
      <div className="chat-wrapper">
        <div className="chat-container" ref={chatContainerRef}>
          {filteredMessages.map((message) => (
            <div 
              key={message.id} 
              className={`message-row ${message.isUser ? 'user-row' : 'ai-row'}`}
            >
              {/* AI Avatar (left side) */}
              {!message.isUser && (
                <div className="avatar ai-avatar">
                  <div className="avatar-glow"></div>
                  🤖
                </div>
              )}
              
              {/* Message Bubble */}
              <div className={`message-bubble ${message.isUser ? 'user-message' : 'ai-message'} ${message.isTyping ? 'typing' : ''}`}>
                <div className="message-content">
                  <div className="message-text">
                    {message.isTyping ? (
                      <span className="typing-text">{message.text}</span>
                    ) : (
                      message.text
                    )}
                  </div>
                  <div className="message-meta">
                    {message.timestamp && (
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    )}
                    {!message.isTyping && (
                      <div className="message-actions">
                        <button
                          className="action-btn"
                          onClick={() => copyMessage(message.text)}
                          title="Copy message"
                          aria-label="Copy message"
                        >
                          📋
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {!message.isTyping && <div className="message-shine"></div>}
              </div>

              {/* User Avatar (right side) */}
              {message.isUser && (
                <div className="avatar user-avatar">
                  <div className="avatar-glow"></div>
                  👤
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Animation */}
          {isLoading && !showTypingSimulation && (
            <div className="message-row ai-row">
              <div className="avatar ai-avatar">
                <div className="avatar-glow"></div>
                🤖
              </div>
              <div className="message-bubble ai-message loading-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="message-text">AI is thinking...</div>
              </div>
            </div>
          )}
          
          {/* Auto-scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <div className="input-field-container">
            <div className="input-glow"></div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... ✨"
              disabled={isLoading}
              className="chat-input"
              autoFocus
              maxLength={1000}
              rows={1}
              style={{
                resize: 'none',
                overflow: 'hidden',
                minHeight: '52px',
                maxHeight: '120px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            {characterInfo.currentLength > 0 && (
              <div className={`character-count ${characterInfo.isNearLimit ? 'near-limit' : ''}`}>
                {characterInfo.currentLength}/{characterInfo.maxLength}
              </div>
            )}
          </div>
          
          {/* Voice Input Button */}
          {recognition && (
            <button
              className={`voice-button ${isRecording ? 'recording' : ''}`}
              onClick={startVoiceInput}
              disabled={isLoading || isRecording}
              title="Voice Input"
              aria-label="Start voice input"
            >
              {isRecording ? '🎙️' : '🎤'}
              {isRecording && <div className="recording-pulse"></div>}
            </button>
          )}
          
          <button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="send-button"
            aria-label="Send message"
            title="Send message (Enter)"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <span className="send-icon">➤</span>
                <div className="button-glow"></div>
              </>
            )}
          </button>
        </div>
        <div className="input-footer">
          <span className="input-hint">
            Press Enter to send • Shift+Enter for new line • Max 1000 characters
            {recognition && ' • Click 🎤 for voice input'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
