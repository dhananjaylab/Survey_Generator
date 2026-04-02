# ✨ AI Survey Generator 🤖

**🚀 Generate intelligent surveys in minutes using AI! ✅**

AI Survey Generator is a powerful tool that automates the creation of survey questionnaires.  Simply provide your project details, business context, and research goals, and the application will use advanced AI to design a relevant and comprehensive survey for you.

**🌟 Key Features:**

*   **🧠 AI-Powered Survey Creation:** Leverages OpenAI's GPT-3 and ChatGPT to generate smart survey questions and structures.
*   **🖱️ Web Wizard Interface:**  User-friendly web interface guides you through the survey creation process step-by-step.
*   **💻 REST API Access:**  Programmatic API for seamless integration of survey generation into other applications.
*   **⚙️ Customizable and Configurable:**  Adjust settings like AI model choice, question types, and survey length to fit your needs.
*   **📄 Output in DOCX Format:**  Download ready-to-use survey documents in DOCX format, compatible with Google Docs and Microsoft Word.

---

**▶️ How to Use:**

1.  **Web UI:**  Run the `app.py` application and access the interactive web wizard in your browser to create surveys visually.
2.  **💻 REST API:** Run the `flask_api.py` application and send API requests to programmatically generate surveys for automated workflows.

---

**🛠️ Key Technologies:**

*   **Flask:** 🐍 Python web framework powering both the user interface and the API backend.
*   **OpenAI API:** 🧪 GPT-3 and ChatGPT models providing cutting-edge AI content generation capabilities.
*   **Python-docx:** 📄 Library for efficient creation and manipulation of DOCX files.

---

**⚙️ Setup (Quick Setup):**

1.  ⬇️ Install Python and required libraries (refer to the detailed documentation for comprehensive steps).
2.  🔑 Configure your OpenAI API key within the `config.ini` file.
3.  🚀 Run either `app.py` (for the web UI) or `flask_api.py` (for the REST API).

---

**🏆 Benefits:**

*   **⏱️ Save Time:**  Create surveys rapidly without tedious manual question writing.
*   **👍 Improve Survey Quality:** AI assistance helps generate relevant and comprehensive questions perfectly aligned with your research objectives.
*   **💯 Easy to Use:** User-friendly web interface and straightforward API access for all users.

---

## 🪟 Windows Users

If you're running this application on Windows, Celery requires special configuration. See [WINDOWS_CELERY_SETUP.md](WINDOWS_CELERY_SETUP.md) for detailed setup instructions, including:
- Why Windows needs different pool configuration
- Development setup with solo pool
- Production setup with gevent pool
- Troubleshooting common Windows Celery issues

**Quick start for Windows:**
```bash
# Development (automatic solo pool)
celery -A app.core.celery worker --loglevel=info

# Production (automatic gevent pool)
set CELERY_ENV=production
celery -A app.core.celery worker --loglevel=info
```

---

## 🐧 Linux/Mac Users

Celery continues to use the prefork pool automatically on Linux and Mac systems:
```bash
celery -A app.core.celery worker --loglevel=info
```

No special configuration needed.