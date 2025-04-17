
# Voice Interactive Web Application

A beautiful web application that allows users to interact with an AI assistant using their voice, as well as upload documents to chat about their contents.

## Features

- Voice interaction with AI assistant
- Document upload and processing (PDF, DOCX, TXT)
- Text and voice responses from the assistant
- Clean, modern UI with beautiful animations
- Responsive design for all device sizes

## Project Structure

### Frontend (React + TypeScript)
- React components for UI
- Tailwind CSS for styling
- Voice recording and playback functionality
- Document upload capabilities

### Backend (Python + Flask)
- Flask API for handling requests
- Document processing (PDF, DOCX, TXT)
- Integration with OpenAI for AI assistance
- Voice transcription and text-to-speech

## Getting Started

### Prerequisites

- Node.js and npm for the frontend
- Python 3.7+ for the backend
- OpenAI API key

### Frontend Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Backend Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```
   pip install flask flask-cors python-docx PyPDF2 openai
   ```
3. Set your OpenAI API key in `server.py`
4. Start the Flask server:
   ```
   python server.py
   ```

## API Endpoints

- `POST /upload` - Upload a document
- `POST /chat` - Send a text message and get a response
- `POST /audio-chat` - Send a voice recording and get a response

## Usage

1. Open the web application
2. Click the microphone button to start speaking
3. Upload documents using the file upload section
4. Ask questions about the uploaded documents
5. The AI assistant will respond with both text and voice

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- Flask
- OpenAI API
- Web Audio API

## License

This project is licensed under the MIT License - see the LICENSE file for details.
