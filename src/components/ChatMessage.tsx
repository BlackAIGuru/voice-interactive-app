
import React, { useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/services/api';

interface ChatMessageProps {
  message: Message;
  isPlaying: boolean;
  onPlayToggle?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isPlaying,
  onPlayToggle
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Scroll into view when a new message appears
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isUser = message.role === 'user';
  
  return (
    <div 
      ref={messageRef}
      className={cn(
        'chat-message',
        isUser ? 'user-message' : 'assistant-message'
      )}
    >
      <div className="flex items-start gap-2">
        {message.isAudio && message.role === 'assistant' && (
          <button
            onClick={onPlayToggle}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-assistant-primary bg-opacity-30 hover:bg-opacity-50",
              "transition-colors duration-200"
            )}
            aria-label={isPlaying ? "Pause speech" : "Play speech"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}
        <div className="flex-1">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
