# ModelMind: DocuBridge’s AI Financial Modeling Assistant

ModelMind is a browser-based AI assistant that simplifies financial modeling and analysis. Users can upload Excel files and ask natural-language questions about the data. Powered by Google's Gemini, ModelMind responds with clear, human-readable insights — no Excel plugin or technical background required.

Created as part of the **Harvard Undergraduate Ventures-Tech Summer Program (HUVTSP 2025)**, this tool helps make financial models more accessible, especially for junior analysts, students, and non-technical users.

**Disclaimer:** This project is a prototype created for educational purposes during the **Harvard Undergraduate Ventures-Tech Summer Program (HUVTSP 2025)**. It is not officially affiliated with **DocuBridge, OpenAI, or Microsoft Excel**. All financial models used for testing should be public sample data only. Do not upload any sensitive, private, or proprietary files.

---

## Features

- Upload `.xlsx` Excel spreadsheets**
- Ask open-ended, natural language questions about your data, such as:
  - “What drives EBITDA in this model?”
  - “Why did net income decline in 2023?”
  - “Summarize cash flow trends over the last 3 years”
- GPT-powered responses deliver plain-English explanations
- Supports layered follow-up questions (e.g. “Why?”, “How did that happen?”)
- No Excel plugin needed — everything runs in your browser

---

## Tech Stack

| Layer         | Tools Used                                       |
| ------------- | ------------------------------------------------ |
| **Frontend**  | HTML, CSS (Bootstrap)                            |
| **Backend**   | Python, Flask, Pandas                            |
| **AI Engine** | Google Gemini (via API)                          |
| **Hosting**   | Local (VS Code) with GitHub for version control  |
| **Versioning**| Git, GitHub                                      |

---

## Project Structure

docubridge-y1t/
├── static/                 # CSS and JavaScript files
│   ├── css/
│   └── js/
├── templates/              # HTML templates
│   └── index.html
├── venv/                   # Virtual environment (ignored by Git)
├── app.py                  # Flask app logic
├── config.py               # Configuration file
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation (this file)

---

## Setup Instructions

> Prerequisites: Python 3.12+, Git installed, and a GitHub account.

### 1. Clone the repository
**In BASH terminal:**
```bash
git clone https://github.com/HugoC1000/docubridge-y1t.git
cd docubridge-y1t
```

### 2. Create and activate a virtual environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables (if needed)
- Copy `config.example.py` to `config.py` and add your API keys or configuration details as instructed in the file.

### 5. Run the application
```bash
python app.py
```
- Open your browser and go to `http://localhost:5000`

---

If you encounter issues, ensure your Python version is correct and all dependencies are installed.

---

## Contributors
*Members of the HUVTSP 2025 Cohort, listed in alphabetical order by last name. All listed were assigned to the project. Actual contributions may vary.*

- [Hugo Chung](https://github.com/HugoC1000)
- [Maruthi Kavuri](#)
- [Naaisha Mahajan](https://github.com/baaisha)
- [Emily Lopez](https://github.com/ThisIsEmily13)
- [Pratyay Rao](https://github.com/PratyayVRao)
- [Anshul Shah](https://github.com/ashah28-create)
- [Wing Yan Tan](https://github.com/Venus-tan)

---

## Support
For questions or feedback, please open an issue on GitHub or contact one of the contributors.
