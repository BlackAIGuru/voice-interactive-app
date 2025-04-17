from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
import uuid
import time
from werkzeug.utils import secure_filename

import docx
import PyPDF2
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)
CORS(app)

# Upload and audio directories
UPLOAD_FOLDER = 'uploads'
AUDIO_FOLDER = 'audio'

for folder in [UPLOAD_FOLDER, AUDIO_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['AUDIO_FOLDER'] = AUDIO_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit

# In-memory doc storage
documents = {}

# --- Text Extraction ---
def extract_text_from_pdf(file_path):
    text = ""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text
    return text

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    return "\n".join(paragraph.text for paragraph in doc.paragraphs)

def extract_text_from_txt(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

# --- Routes ---
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    try:
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        elif filename.endswith('.docx'):
            text = extract_text_from_docx(file_path)
        elif filename.endswith('.txt'):
            text = extract_text_from_txt(file_path)
        else:
            return jsonify({'success': False, 'message': 'Unsupported file format'}), 400

        doc_id = str(uuid.uuid4())
        documents[doc_id] = {
            'filename': filename,
            'text': text,
            'uploaded_at': time.time()
        }

        return jsonify({
            'success': True,
            'message': 'File uploaded and processed successfully',
            'document_id': doc_id
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing file: {str(e)}'}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')

    doc_text = ""
    if documents:
        latest_doc = max(documents.values(), key=lambda x: x['uploaded_at'])
        doc_text = latest_doc['text']

    try:
        system_message = "You are a helpful assistant."
        if doc_text:
            system_message += " The user has uploaded a document with the following content: " + doc_text[:2000] + "..."

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
        )
        assistant_response = response.choices[0].message.content

        # Save audio to /audio folder
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_file_path = os.path.join(app.config['AUDIO_FOLDER'], audio_filename)

        with client.with_streaming_response.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=assistant_response
        ) as speech_response:
            with open(audio_file_path, "wb") as f:
                for chunk in speech_response.iter_bytes():
                    f.write(chunk)

        audio_url = f"/audio/{audio_filename}"

        return jsonify({
            'message': assistant_response,
            'audioUrl': "https://pweb5l7qknzn40-5000.proxy.runpod.net" + audio_url
        })

    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return jsonify({'error': 'Failed to process message'}), 500

@app.route('/audio-chat', methods=['POST'])
def audio_chat():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
    audio_file.save(temp_audio.name)
    temp_audio.close()

    try:
        with open(temp_audio.name, "rb") as af:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=af
            )
        transcription = transcript.text

        doc_text = ""
        if documents:
            latest_doc = max(documents.values(), key=lambda x: x['uploaded_at'])
            doc_text = latest_doc['text']

        system_message = "You are a helpful assistant."
        if doc_text:
            system_message += " The user has uploaded a document with the following content: " + doc_text[:2000] + "..."

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": transcription}
            ]
        )
        assistant_response = response.choices[0].message.content

        # Save audio to /audio folder
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_file_path = os.path.join(app.config['AUDIO_FOLDER'], audio_filename)

        with client.with_streaming_response.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=assistant_response
        ) as speech_response:
            with open(audio_file_path, "wb") as f:
                for chunk in speech_response.iter_bytes():
                    f.write(chunk)

        audio_url = f"/audio/{audio_filename}"

        return jsonify({
            'userMessage': transcription,
            'message': assistant_response,
            'transcription': transcription,
            'audioUrl': "https://pweb5l7qknzn40-5000.proxy.runpod.net" + audio_url
        })

    except Exception as e:
        print(f"Error in audio chat: {str(e)}")
        return jsonify({'error': 'Failed to process audio'}), 500
    finally:
        if os.path.exists(temp_audio.name):
            os.unlink(temp_audio.name)

@app.route('/audio/<filename>')
def serve_audio(filename):
    return send_from_directory(app.config['AUDIO_FOLDER'], filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
