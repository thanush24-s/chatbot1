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
  QueryDocumentSnapshot
} from 'firebase/firestore';

// Define message type
interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp?: Date;
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

  // Function to load chat history from Firebase
  const loadChatHistory = () => {
    const messagesRef = collection(db, 'chats', 'default-chat', 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    // ✅ Fixed: Added proper TypeScript types for callback parameters
    const unsubscribe = onSnapshot(
      q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const loadedMessages: Message[] = [];
        let counter = 1;
        
        // Add welcome message if no messages exist
        if (snapshot.empty) {
          loadedMessages.push({
            id: counter++,
            text: "Hi! I'm Gemini Pro, your AI assistant. How can I help you today? 🚀",
            isUser: false,
            timestamp: new Date()
          });
        } else {
          // ✅ Fixed: Added proper TypeScript type for doc parameter
          snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            loadedMessages.push({
              id: counter++,
              text: data.text,
              isUser: data.isUser,
              timestamp: data.timestamp?.toDate() || new Date()
            });
          });
        }
        
        setMessages(loadedMessages);
        setMessageCounter(counter);
      },
      (error) => {
        console.error('Error loading chat history:', error);
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
        timestamp: Timestamp.fromDate(new Date())
      });
      console.log('✅ Message saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving message to Firebase:', error);
    }
  };

  // Function to send message
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) return; // Don't send empty messages
    
    const currentInput = input; // Store input before clearing
    setInput(''); // Clear input immediately
    setIsLoading(true); // Show loading

    // Save user message to Firebase
    await saveMessageToFirebase(currentInput, true);
    
    try {
      // Send to backend
      const response = await axios.post('http://localhost:8000/chat', {
        message: currentInput
      });
      
      // Save AI message to Firebase
      await saveMessageToFirebase(response.data.response, false);
      
    } catch (error) {
      // Handle error
      const errorMessage = "⚠️ Sorry, I couldn't connect to the AI. Make sure the backend is running!";
      await saveMessageToFirebase(errorMessage, false);
    }
    
    setIsLoading(false); // Hide loading
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="ai-avatar-header">🤖</div>
          <div className="header-text">
            <h1>AI Chatbot</h1>
            <p>Powered by Gemini Pro + Firebase</p>
          </div>
        </div>
      </div>

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
                <div className="message-text">{message.text}</div>
                {message.timestamp && (
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                )}
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
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            disabled={isLoading}
            className="chat-input"
            autoFocus
          />
          <button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="send-button"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <span className="send-icon">➤</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
