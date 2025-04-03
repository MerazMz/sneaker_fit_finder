from flask import Flask, request, jsonify, render_template, url_for, session
from flask_cors import CORS
import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import uuid

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create upload folder if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
CORS(app)

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Configure Gemini API
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    chat_model = genai.GenerativeModel('gemini-1.5-flash')
    image_model = genai.GenerativeModel('gemini-1.5-flash-002')
    logger.info("Gemini API configured successfully")
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {str(e)}")
    chat_model = None
    image_model = None

# Sneaker fit context for the AI
SNEAKER_FIT_CONTEXT = """
You are a professional sneaker fit expert. Help users find the perfect sneaker fit by asking about:
1. Foot measurements (length, width)
2. Preferred fit style (snug, standard, loose)
3. Brand preferences and past experiences
4. Any foot conditions or special requirements
5. Keep your response minimal and up to the point.

Provide accurate size recommendations based on brand-specific sizing charts.
Be professional but friendly, and guide users step by step through the fit assessment process.
Avoid the use of asterisks in your response and make your response look neat, justified and organized.
"""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_id = data.get('conversation_id', None)
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Retrieve chat history if conversation_id exists
        chat_history = session.get('chat_history', [])
        
        # Add user message to history
        chat_history.append({"role": "user", "content": user_message})
        
        if not chat_model:
            return jsonify({"error": "AI service unavailable"}), 503
        
        # Create a new chat session with Gemini
        chat = chat_model.start_chat(history=[])
        
        # First, send the context message
        chat.send_message(SNEAKER_FIT_CONTEXT)
        
        # Then, send all previous messages from history to maintain context
        # Skip the message we just added as we'll send it separately
        for msg in chat_history[:-1]:
            if msg["role"] == "user":
                chat.send_message(msg["content"])
        
        # Finally, send the current user message and get response
        response = chat.send_message(user_message)
        ai_response = response.text
        
        # Add AI response to history
        chat_history.append({"role": "assistant", "content": ai_response})
        
        # Store updated history in session
        session['chat_history'] = chat_history
        
        # Ensure conversation_id exists
        if 'conversation_id' not in session:
            session['conversation_id'] = str(uuid.uuid4())
        
        return jsonify({
            "response": ai_response,
            "conversation_id": session['conversation_id']
        })
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/image-analysis', methods=['POST'])
def image_analysis():
    try:
        # Check if image is present in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        query = request.form.get('query', 'What can you tell me about these sneakers?')
        
        # Validate file
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Save file with unique name
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process image with Gemini
        with open(filepath, 'rb') as img_file:
            image_data = img_file.read()
        
        # Create a system prompt for sneaker image analysis
        system_prompt = """
        You are a professional sneaker fit expert analyzing an image of sneakers.
        Identify the brand, model, and any notable features of the sneakers in the image.
        If possible, provide sizing recommendations or fit characteristics for this specific model.
        Comment on authenticity indicators if visible.
        Keep your response minimal, professional and well-organized.
        """
        
        if not image_model:
            return jsonify({"error": "AI image service unavailable"}), 503
        
        # Generate response using Gemini Vision
        response = image_model.generate_content([
            system_prompt,
            f"User query about these sneakers: {query}",
            {"mime_type": f"image/{filepath.split('.')[-1]}", "data": image_data}
        ])
        
        return jsonify({'response': response.text})
    
    except Exception as e:
        logger.error(f"Error in image analysis endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_conversation():
    session.pop('chat_history', None)
    session['conversation_id'] = str(uuid.uuid4())
    return jsonify({"status": "conversation reset", "conversation_id": session['conversation_id']})

if __name__ == '__main__':
    # Force debug mode to True for development
    app.debug = True
    
    # Enable hot reloading with explicit settings
    # This ensures the server restarts when app.py changes
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    
    # Run the app with reloader enabled and threaded for better performance
    app.run(
        debug=True, 
        use_reloader=True,
        host='0.0.0.0', 
        port=5000,
        threaded=True,
        extra_files=[__file__]  # Explicitly watch this file for changes
    )