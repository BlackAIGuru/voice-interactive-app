
// Types for our API responses and requests
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  isAudio?: boolean;
}

export interface ChatResponse {
  userMessage: any;
  message: string;
  audioUrl?: string;
}

// Base URL for our API
const API_BASE_URL = 'https://7cf7i67kmosrkb-5000.proxy.runpod.net';

// API service for handling communication with our Flask backend
export const apiService = {
  // Upload a document to the server
  async uploadDocument(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }
      
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  },

  // Send a chat message to the API and get a response
  async sendMessage(message: string, isAudio: boolean = false): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, isAudio }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  },

  // Send audio data to the API for transcription and response
  async sendAudioMessage(audioBlob: Blob): Promise<ChatResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(`${API_BASE_URL}/audio-chat`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process audio');
      }

      return await response.json();
    } catch (error) {
      console.error('Audio chat error:', error);
      throw error;
    }
  }
};
