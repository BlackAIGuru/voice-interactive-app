
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import MicButton from './MicButton';
import ChatMessage from './ChatMessage';
import FileUpload from './FileUpload';
import { Message, apiService } from '@/services/api';
import { cn } from '@/lib/utils';
import { VolumeX, Info, Send } from 'lucide-react';

const VoiceChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [hasUploadedDocument, setHasUploadedDocument] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setCurrentPlayingId(null);
      // Auto restart recording when the assistant finishes speaking
      if (isContinuousMode && !isRecording && !isProcessing) {
        startRecording();
      }
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isContinuousMode, isRecording, isProcessing]);

  // Check microphone permission on mount
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermission(true);
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setMicPermission(false);
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice chat.",
          variant: "destructive"
        });
      }
    };
    
    checkMicPermission();
  }, [toast]);

  const handleToggleRecording = async () => {
    if (!isRecording && !isContinuousMode) {
      // Start a new continuous conversation
      startRecording();
      setIsContinuousMode(true);
    } else if (isRecording && isContinuousMode) {
      // Stop in continuous mode means end the entire conversation
      stopRecording();
      setIsContinuousMode(false);
    } else if (isRecording) {
      // Normal stop recording (not in continuous mode)
      stopRecording();
    } else {
      // Normal start recording (not in continuous mode)
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleAudioStop;
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Only add the "Recording..." indicator if we're not in continuous mode
      // or if this is the first message in a continuous conversation
      if (!isContinuousMode || messages.length === 0) {
        const newUserMessage: Message = {
          id: Date.now().toString(),
          content: "Recording...",
          role: 'user',
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, newUserMessage]);
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive"
      });
      setMicPermission(false);
      setIsContinuousMode(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleAudioStop = async () => {
    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Update the "Recording..." message with "Processing..."
      setMessages(prev => 
        prev.map(msg => 
          msg.content === "Recording..." 
            ? { ...msg, content: "Processing your message..." } 
            : msg
        )
      );
      
      // Send the audio to the server for processing
      const response = await apiService.sendAudioMessage(audioBlob);
      
      // Replace the temporary message with the actual transcription
      const transcription = response.message;
      const messageId = Date.now().toString();
      
      setMessages(prev => {
        // Remove the "Processing..." message
        const filteredMessages = prev.filter(msg => msg.content !== "Processing your message...");
        
        // Add the transcribed user message
        const userMessage: Message = {
          id: messageId,
          content: transcription,
          role: 'user',
          timestamp: Date.now()
        };
        
        // Add the assistant's response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.message,
          role: 'assistant',
          timestamp: Date.now() + 1,
          isAudio: !!response.audioUrl
        };
        
        return [...filteredMessages, userMessage, assistantMessage];
      });
      
      // If there's an audio URL in the response, play it
      if (response.audioUrl && audioRef.current) {
        audioRef.current.src = response.audioUrl;
        audioRef.current.play();
        setCurrentPlayingId((Date.now() + 1).toString());
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing failed",
        description: "Could not process your voice message. Please try again.",
        variant: "destructive"
      });
      
      // Remove the "Processing..." message
      setMessages(prev => prev.filter(msg => msg.content !== "Processing your message..."));
      setIsContinuousMode(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayToggle = (messageId: string, audioUrl?: string) => {
    if (!audioRef.current || !audioUrl) return;
    
    if (currentPlayingId === messageId) {
      // Pause current audio
      audioRef.current.pause();
      setCurrentPlayingId(null);
    } else {
      // Play new audio
      if (currentPlayingId) {
        // Stop any currently playing audio
        audioRef.current.pause();
      }
      
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setCurrentPlayingId(messageId);
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: textInput,
      role: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);
    
    try {
      const response = await apiService.sendMessage(textInput);
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: response.message,
        role: 'assistant',
        timestamp: Date.now(),
        isAudio: !!response.audioUrl
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Play audio response if available
      if (response.audioUrl && audioRef.current) {
        audioRef.current.src = response.audioUrl;
        audioRef.current.play();
        setCurrentPlayingId(assistantMessage.id);
      }
      
    } catch (error) {
      console.error('Error sending text message:', error);
      toast({
        title: "Message failed",
        description: "Could not send your message. Please try again.",
        variant: "destructive"
      });
      setIsContinuousMode(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadSuccess = () => {
    setHasUploadedDocument(true);
    toast({
      title: "Document ready",
      description: "You can now ask questions about your document.",
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="min-h-screen gradient-background flex flex-col">
      <header className="w-full py-6 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-assistant-text">
          AI Voice Assistant
        </h1>
      </header>
      
      <main className="flex-1 flex flex-col px-4 sm:px-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center mb-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-assistant-primary to-assistant-secondary opacity-30 mb-6 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-assistant-primary flex items-center justify-center">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-assistant-secondary"></div>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium text-assistant-text mb-2">
              Click the mic to start a voice conversation
            </h2>
            <p className="text-muted-foreground max-w-md">
              You can also upload a document to chat about its contents
            </p>
          </div>
        )}
        
        {messages.length > 0 && (
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto py-4 chat-container"
            style={{ maxHeight: 'calc(100vh - 300px)' }}
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isPlaying={currentPlayingId === message.id}
                onPlayToggle={() => handlePlayToggle(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        <div className="py-4">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
        
        <div className="w-full flex items-center justify-center mb-8">
          {micPermission === false && (
            <div className="bg-destructive bg-opacity-10 text-destructive p-3 rounded-lg mb-4 flex items-center">
              <VolumeX size={20} className="mr-2" />
              <span>Microphone access denied. Please enable it in your browser settings.</span>
            </div>
          )}

          <div className="flex flex-col items-center">
            {hasUploadedDocument && (
              <div className="mb-4 p-2 bg-assistant-primary bg-opacity-20 rounded-lg text-sm flex items-center">
                <Info size={16} className="mr-2 text-assistant-secondary" />
                <span>Document uploaded. Ask questions about it!</span>
              </div>
            )}
            
            <MicButton
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
              isDisabled={isProcessing}
              isStopMode={isContinuousMode && isRecording}
            />
            
            <p className="text-center text-muted-foreground mt-3 text-sm">
              {isRecording && isContinuousMode
                ? "Continuous mode active. Click to stop conversation"
                : isRecording 
                  ? "Recording... Click to stop" 
                  : "Tap to speak"}
            </p>
          </div>
        </div>
        
        <div className="pb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message instead..."
              className="flex-1 bg-white border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-assistant-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              disabled={isProcessing}
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isProcessing}
              className={cn(
                "bg-assistant-primary p-2.5 rounded-lg",
                "hover:bg-assistant-secondary transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-assistant-primary"
              )}
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VoiceChat;
