from flask import Flask, render_template, request, jsonify, session
import pandas as pd
from werkzeug.utils import secure_filename
from io import BytesIO
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv("FLASK_SECRET_KEY", "supersecret")

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
print("Using Gemini API key:", api_key)
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat')
def chat():
    prefill = request.args.get('q', default='', type=str)
    return render_template('chat.html', prefill=prefill)

def allowed_filetype(filename):
    return filename.lower().endswith('.xls') or filename.lower().endswith('.xlsx')

def generate_analysis_context(df):
    context = []
    
    # dataset info
    rows, cols = df.shape
    context.append(f"Dataset: {rows} rows, {cols} columns")
    context.append(f"Columns: {', '.join(df.columns.tolist())}")
    
    # missing values found
    missing_data = df.isnull().sum()
    if missing_data.any():
        missing_cols = missing_data[missing_data > 0]
        context.append(f"Missing values detected: {dict(missing_cols)}")
    
    # check for numeric columns. 
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        context.append(f"Numeric columns: {', '.join(numeric_cols)}")
        for col in numeric_cols[:3]:  # limsit first three for now
            try:
                stats = df[col].describe()
                context.append(f"{col} range: {stats['min']:.2f} to {stats['max']:.2f}, mean: {stats['mean']:.2f}")
            except:
                pass
    
    #check for date columns
    date_cols = df.select_dtypes(include=['datetime']).columns
    if len(date_cols) > 0:
        context.append(f"Date columns: {', '.join(date_cols)}")
        for col in date_cols:
            try:
                date_range = f"{df[col].min()} to {df[col].max()}"
                context.append(f"{col} spans: {date_range}")
            except:
                pass
    
    #check for excel errors
    error_indicators = ['#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#N/A', '#NULL!']
    for col in df.columns:
        if df[col].dtype == 'object':  # Text columns might contain error strings
            for error in error_indicators:
                if df[col].astype(str).str.contains(error, na=False).any():
                    error_count = df[col].astype(str).str.contains(error, na=False).sum()
                    context.append(f"ERROR DETECTED: {error_count} instances of '{error}' in column '{col}'")
    
    #look for financial indicators
    financial_keywords = ['revenue', 'profit', 'cost', 'expense', 'income', 'sales', 'total', 'sum']
    potential_financial_cols = []
    for col in df.columns:
        if any(keyword in col.lower() for keyword in financial_keywords):
            potential_financial_cols.append(col)
    
    if potential_financial_cols:
        context.append(f"Potential financial columns identified: {', '.join(potential_financial_cols)}")
    
    return "\n".join(context)

@app.route('/upload', methods=["POST"])
def uploadForm():
    if 'excel_file' not in request.files or 'user_question' not in request.form:
        return jsonify({"confirmation": "Missing file or question.", "table_html": "", "answer": ""}), 400

    question = request.form.get('user_question')
    file = request.files['excel_file']

    if file.filename == '':
        return jsonify({"confirmation": "No file selected.", "table_html": "", "answer": ""}), 400
    if question == '':
        return jsonify({"confirmation": "No question given.", "table_html": "", "answer": ""}), 400
    if not allowed_filetype(file.filename):
        return jsonify({"confirmation": "Not an allowed filetype.", "table_html": "", "answer": ""}), 400

    confirmation = f"File received: {file.filename}. Question received: {question}"

    try:
        excel_bytes = file.read()
        excel_io = BytesIO(excel_bytes)
        df = pd.read_excel(excel_io)
        
        # file limit is 10MB
        if len(excel_bytes) > 10 * 1024 * 1024:
            return jsonify({
                "confirmation": "File too large. Please upload a file smaller than 10MB.",
                "table_html": "",
                "answer": ""
            }), 400
        
        analysis_context = generate_analysis_context(df)
        table_html = df.head().to_html(classes="table table-bordered table-sm", index=False)

        # store data and metadata in session for reuse
        csv_data = df.to_csv(index=False)
        session['csv_data'] = csv_data
        session['analysis_context'] = analysis_context
        session['filename'] = secure_filename(file.filename)

        # Debug: log what we're passing (length + small preview)
        try:
            print(f"csv_data length: {len(csv_data)} chars | rows: {len(df)} cols: {len(df.columns)}")
            print("csv_data preview:", repr(csv_data[:200]))
        except Exception as _e:
            pass


        prompt = f"""You are a financial analysis AI assistant specialized in Excel/spreadsheet data analysis.

SPREADSHEET ANALYSIS:
{analysis_context}

FULL DATA (CSV — entire dataset):
{csv_data}

USER QUESTION:
{question}

INSTRUCTIONS:
- The CSV block above contains the ENTIRE dataset (not just a sample). Do not claim the upload is incomplete unless the referenced columns are truly missing from the CSV.
- Base your answer strictly on the provided data
- For financial calculations, show your work step by step
- If you detect any data quality issues, mention them
- Provide specific numbers and references to columns/rows when relevant
- If the question cannot be answered with the available data, explain what additional information would be needed

ANSWER:"""

        print("Prompt sent to Gemini:\n", prompt)
        response = model.generate_content(prompt)
        answer = response.text.strip()
        print("Response from Gemini:\n", answer)

    except Exception as e:
        print("Error during processing:", e)
        return jsonify({
            "confirmation": f"Error: {e}",
            "table_html": "",
            "answer": ""
        }), 500

    return jsonify({
        "confirmation": confirmation,
        "table_html": table_html,
        "answer": answer
    })

@app.route('/ask', methods=["POST"])
def followUpQuestion():
    if 'csv_data' not in session:
        return jsonify({"confirmation": "No dataset uploaded yet. Please upload an Excel file first.", "answer": ""}), 400

    question = request.json.get("followup_question", "").strip()
    if not question:
        return jsonify({"confirmation": "No follow-up question provided.", "answer": ""}), 400

    csv_data = session['csv_data']
    analysis_context = session.get('analysis_context', 'No analysis context available.')
    filename = session.get('filename', 'uploaded file')

    # Debug: log what we're passing (length + small preview)
    try:
        print(f"[follow-up] csv_data length: {len(csv_data)} chars")
        print("[follow-up] csv_data preview:", repr(csv_data[:200]))
    except Exception as _e:
        pass

    prompt = f"""You are a financial analysis AI assistant continuing analysis of the spreadsheet "{filename}".

PREVIOUS ANALYSIS CONTEXT:
{analysis_context}

FULL DATA (CSV — entire dataset):
{csv_data}

FOLLOW-UP QUESTION:
{question}

INSTRUCTIONS:
- The CSV block above contains the ENTIRE dataset (not just a sample). Do not claim the upload is incomplete unless the referenced columns are truly missing from the CSV.
- This is a follow-up question about the same dataset
- Reference previous context and maintain consistency
- Base your answer strictly on the provided data
- For financial calculations, show your work step by step
- Provide specific numbers and references when relevant

ANSWER:"""

    print("Follow-up prompt sent to Gemini:\n", prompt)
    try:
        response = model.generate_content(prompt)
        answer = response.text.strip()
        print("Follow-up response:\n", answer)
    except Exception as e:
        print("Error during follow-up:", e)
        return jsonify({"confirmation": f"Error: {e}", "answer": ""}), 500

    return jsonify({"confirmation": f"Analyzing follow-up question about {filename}...", "answer": answer})

@app.route('/reset', methods=["POST"])
def reset_session():
    """Clear the current session to allow uploading a new file"""
    session.clear()
    return jsonify({"confirmation": "Session cleared. You can now upload a new file.", "status": "success"})

@app.route('/status', methods=["GET"])
def get_status():
    """Check if there's an active session with uploaded data"""
    has_data = 'csv_data' in session
    filename = session.get('filename', '') if has_data else ''
    return jsonify({
        "has_data": has_data,
        "filename": filename,
        "status": "active" if has_data else "ready"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
