import React, { useState, useRef, useEffect } from 'react';
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

  // Reference for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history from Firebase when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatbot-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
    localStorage.setItem('chatbot-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
            text: "👋 Hi! I'm Gemini Pro, your AI assistant. How can I help you today?",
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

  // Function to send message
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return; // Don't send empty messages
    
    const currentInput = input; // Store input before clearing
    setInput(''); // Clear input immediately
    setIsLoading(true); // Show loading
    setError(''); // Clear any previous errors

    // Save user message to Firebase
    await saveMessageToFirebase(currentInput, true);
    
    try {
      // Send to backend
      const response = await axios.post('http://localhost:8000/chat', {
        message: currentInput
      }, {
        timeout: 30000 // 30 second timeout
      });
      
      // Save AI message to Firebase
      await saveMessageToFirebase(response.data.response, false);
      
    } catch (error) {
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
      showToast('Message copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy message:', error);
      showToast('Failed to copy message', 'error');
    }
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
        showToast('Chat cleared successfully', 'success');
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
    showToast(`Switched to ${!isDarkMode ? 'dark' : 'light'} mode`, 'info');
  };

  // Get character count info
  const getCharacterInfo = () => {
    const maxLength = 1000;
    const currentLength = input.length;
    const isNearLimit = currentLength > maxLength * 0.8;
    return { currentLength, maxLength, isNearLimit };
  };

  const characterInfo = getCharacterInfo();

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
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
            <div className="ai-avatar-header">🤖</div>
            <div className="header-text">
              <h1>AI Chatbot</h1>
              <p className="header-subtitle">
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                Powered by Gemini Pro + Firebase
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="header-btn"
              onClick={clearChat}
              title="Clear Chat"
              aria-label="Clear all messages"
            >
              🗑️
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
        <div className="chat-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message-row ${message.isUser ? 'user-row' : 'ai-row'}`}
            >
              {/* AI Avatar (left side) */}
              {!message.isUser && (
                <div className="avatar ai-avatar">🤖</div>
              )}
              
              {/* Message Bubble */}
              <div className={`message-bubble ${message.isUser ? 'user-message' : 'ai-message'}`}>
                <div className="message-content">
                  <div className="message-text">{message.text}</div>
                  <div className="message-meta">
                    {message.timestamp && (
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    )}
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
                  </div>
                </div>
              </div>

              {/* User Avatar (right side) */}
              {message.isUser && (
                <div className="avatar user-avatar">👤</div>
              )}
            </div>
          ))}
          
          {/* Loading Animation */}
          {isLoading && (
            <div className="message-row ai-row">
              <div className="avatar ai-avatar">🤖</div>
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
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
              <span className="send-icon">➤</span>
            )}
          </button>
        </div>
        <div className="input-footer">
          <span className="input-hint">Press Enter to send • Shift+Enter for new line • Max 1000 characters</span>
        </div>
      </div>
    </div>
  );
}

export default App;
