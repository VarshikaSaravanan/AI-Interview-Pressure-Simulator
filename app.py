import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Custom Services
from services.storage_service import save_user, get_user, save_interview, get_interview
from services.resume_parser import parse_resume
from core.vector_store import create_and_save_index, retrieve_context
from core.interview_agent import get_ats_score, initialize_interview_chain, generate_feedback

# Load env variables
load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# In-memory session manager for local use
active_sessions = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "AI Interview API is running"}), 200

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    target_role = request.form.get('target_role', 'Software Engineer')
    user_id = request.form.get('user_id', str(uuid.uuid4()))

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        # Parse Resume
        full_text, chunks = parse_resume(file_path)
        
        # Save to Vector DB
        session_id = str(uuid.uuid4())
        create_and_save_index(chunks, session_id)

        # Get ATS Score
        ats_feedback = get_ats_score(full_text, target_role)

        # Save User Data
        user_data = {
            "resume_path": file_path,
            "target_role": target_role,
            "latest_ats": ats_feedback,
            "current_session_id": session_id
        }
        save_user(user_id, user_data)

        return jsonify({
            "user_id": user_id,
            "session_id": session_id,
            "ats_feedback": ats_feedback,
            "message": "Resume processed successfully"
        }), 200

@app.route('/api/start-interview', methods=['POST'])
def start_interview():
    data = request.json
    session_id = data.get('session_id')
    user_id = data.get('user_id')
    
    if not session_id or not user_id:
        return jsonify({"error": "Missing session_id or user_id"}), 400

    user = get_user(user_id)
    target_role = user.get('target_role') if user else 'Software Engineer'

    # Initialize LangChain
    chain = initialize_interview_chain()
    active_sessions[session_id] = chain

    # Return a static first question instantly to avoid LLM generation latency
    initial_response = f"Hello! I am your AI Interviewer. I have received your resume for the {target_role} position. To start things off, could you briefly introduce yourself and tell me a bit about your background?"

    # Save to JSON
    interview_data = {
        "user_id": user_id,
        "role": target_role,
        "transcript": [{"role": "ai", "text": initial_response}],
        "status": "in_progress"
    }
    save_interview(session_id, interview_data)

    return jsonify({"question": initial_response}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    session_id = data.get('session_id')
    user_message = data.get('message')

    if session_id not in active_sessions:
        return jsonify({"error": "Invalid or expired session"}), 400

    chain = active_sessions[session_id]
    interview = get_interview(session_id)
    target_role = interview.get('role', 'Software Engineer')

    # RAG Context
    resume_context = retrieve_context(session_id, user_message)

    # Generate next question/response
    ai_response = chain.predict(input=user_message, role=target_role, resume_context=resume_context)

    # Update transcript
    interview["transcript"].append({"role": "human", "text": user_message})
    interview["transcript"].append({"role": "ai", "text": ai_response})
    save_interview(session_id, interview)

    return jsonify({"response": ai_response}), 200

@app.route('/api/end-interview', methods=['POST'])
def end_interview():
    data = request.json
    session_id = data.get('session_id')

    if not session_id:
        return jsonify({"error": "Missing session_id"}), 400

    interview = get_interview(session_id)
    if not interview:
        return jsonify({"error": "Interview not found"}), 404

    target_role = interview.get('role', 'Software Engineer')
    transcript_text = "\n".join([f"{t['role']}: {t['text']}" for t in interview.get('transcript', [])])
    
    # Retrieve general context for overall evaluation
    resume_context = retrieve_context(session_id, target_role, k=5)

    feedback = generate_feedback(transcript_text, resume_context, target_role)

    # Update and save
    interview["status"] = "completed"
    interview["feedback"] = feedback
    save_interview(session_id, interview)

    # Cleanup session
    if session_id in active_sessions:
        del active_sessions[session_id]

    return jsonify({"feedback": feedback}), 200

if __name__ == '__main__':
    # Ensure data directories exist
    os.makedirs('data', exist_ok=True)
    os.makedirs('vector_db', exist_ok=True)
    
    app.run(host='0.0.0.0', debug=True, port=5000)
