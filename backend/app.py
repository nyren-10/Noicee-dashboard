import os
import imaplib
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
import threading
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import google.generativeai as genai
import PIL.Image
import io
import json
from dotenv import load_dotenv
import datetime
import math
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

load_dotenv()
app = Flask(__name__)
CORS(app)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

GEMINI_MODEL = 'gemini-3.5-flash'
IST = pytz.timezone('Asia/Kolkata')

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def upgrade_db():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Base Tables (tasks, subjects, timetable)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                due_date TIMESTAMP,
                is_completed BOOLEAN DEFAULT FALSE
            );
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                attended INT DEFAULT 0,
                total_classes INT DEFAULT 0
            );
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS timetable (
                id SERIAL PRIMARY KEY,
                day_of_week VARCHAR(15) NOT NULL,
                subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
                start_time VARCHAR(30) DEFAULT '',
                end_time VARCHAR(30) DEFAULT '',
                teacher VARCHAR(100) DEFAULT '',
                notes TEXT
            );
        ''')
        conn.commit()
    except Exception as e:
        print("Schema init error (base tables):", e)
        conn.rollback()

    try:
        cur.execute("ALTER TABLE timetable ADD COLUMN IF NOT EXISTS end_time VARCHAR(30) DEFAULT '';")
        cur.execute("ALTER TABLE timetable ADD COLUMN IF NOT EXISTS teacher VARCHAR(100) DEFAULT '';")
        cur.execute("ALTER TABLE timetable ALTER COLUMN start_time TYPE VARCHAR(30);")
        cur.execute("ALTER TABLE timetable ALTER COLUMN start_time DROP NOT NULL;")
        cur.execute("DELETE FROM timetable WHERE subject_id IN (SELECT id FROM subjects WHERE trim(name) = '');")
        cur.execute("DELETE FROM subjects WHERE trim(name) = '';")
        conn.commit()
    except Exception as e:
        print("Schema migration error (timetable/clean):", e)
        conn.rollback()

    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        cur.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
        conn.commit()
    except Exception as e:
        print("Schema init error (notes):", e)
        conn.rollback()

    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS sync_history (
                sync_date DATE PRIMARY KEY
            );
        ''')
        conn.commit()
    except Exception as e:
        print("Schema init error (sync_history):", e)
        conn.rollback()

    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS attendance_log (
                id SERIAL PRIMARY KEY,
                subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
                subject_name VARCHAR(100),
                log_date DATE NOT NULL,
                status VARCHAR(10) NOT NULL,
                source VARCHAR(20) DEFAULT 'EMAIL_SYNC',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        conn.commit()
    except Exception as e:
        print("Schema init error (attendance_log):", e)
        conn.rollback()

    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS last_sync_info (
                id INT PRIMARY KEY DEFAULT 1,
                last_sync_at TIMESTAMP,
                next_sync_at TIMESTAMP,
                status VARCHAR(50) DEFAULT 'never'
            );
        ''')
        cur.execute('''
            INSERT INTO last_sync_info (id, status)
            VALUES (1, 'never')
            ON CONFLICT (id) DO NOTHING;
        ''')
        conn.commit()
    except Exception as e:
        print("Schema init error (last_sync_info):", e)
        conn.rollback()

    finally:
        cur.close()
        conn.close()

with app.app_context():
    upgrade_db()

# --- ROOT & HEALTH ROUTES ---
@app.route('/')
def root():
    return jsonify({
        "status": "online",
        "service": "Noicee OS Backend",
        "version": "1.0.0",
        "time": datetime.datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")
    })

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"})

# --- TODO ROUTES ---
@app.route('/api/tasks', methods=['GET', 'POST'])
def handle_tasks():
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'POST':
        cur.execute('INSERT INTO tasks (title) VALUES (%s) RETURNING id, title, is_completed', (request.json['title'],))
        new_task = cur.fetchone()
        conn.commit()
        return jsonify({"id": new_task[0], "title": new_task[1], "is_completed": new_task[2]})
    elif request.method == 'GET':
        cur.execute('SELECT id, title, is_completed FROM tasks ORDER BY id ASC')
        tasks = cur.fetchall()
        return jsonify([{"id": t[0], "title": t[1], "is_completed": t[2]} for t in tasks])

@app.route('/api/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def modify_task(task_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        cur.execute('UPDATE tasks SET is_completed = %s WHERE id = %s', (request.json['is_completed'], task_id))
        conn.commit()
        return jsonify({"message": "Task updated"})
    elif request.method == 'DELETE':
        cur.execute('DELETE FROM tasks WHERE id = %s', (task_id,))
        conn.commit()
        return jsonify({"message": "Task annihilated"})

# --- NOTES ROUTES ---
@app.route('/api/notes', methods=['GET', 'POST'])
def handle_notes():
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'POST':
        data = request.json
        cur.execute('INSERT INTO notes (title, content) VALUES (%s, %s) RETURNING id, title, content, created_at, updated_at', 
                    (data.get('title', 'Untitled'), data.get('content', '')))
        n = cur.fetchone()
        conn.commit()
        return jsonify({"id": n[0], "title": n[1], "content": n[2], "created_at": n[3], "updated_at": n[4]})
    elif request.method == 'GET':
        cur.execute('SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC')
        notes = cur.fetchall()
        return jsonify([{"id": n[0], "title": n[1], "content": n[2], "created_at": n[3], "updated_at": n[4]} for n in notes])

@app.route('/api/notes/<int:note_id>', methods=['PUT', 'DELETE'])
def manage_note(note_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        data = request.json
        cur.execute('''
            UPDATE notes 
            SET title = %s, content = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s 
            RETURNING id, title, content, created_at, updated_at
        ''', (data.get('title'), data.get('content'), note_id))
        n = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if n:
            return jsonify({"id": n[0], "title": n[1], "content": n[2], "created_at": n[3], "updated_at": n[4]})
        return jsonify({"error": "Note not found"}), 404

    elif request.method == 'DELETE':
        cur.execute('DELETE FROM notes WHERE id = %s', (note_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Note trashed"})

# --- SUBJECT ROUTES ---
@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'POST':
        data = request.json
        name = data.get('name')
        attended = data.get('attended', 0)
        total_classes = data.get('total_classes', 0)
        cur.execute(
            'INSERT INTO subjects (name, attended, total_classes) VALUES (%s, %s, %s) RETURNING id, name, attended, total_classes',
            (name, attended, total_classes)
        )
        new_subject = cur.fetchone()
        conn.commit()
        return jsonify({"id": new_subject[0], "name": new_subject[1], "attended": new_subject[2], "total_classes": new_subject[3]})
    elif request.method == 'GET':
        cur.execute('SELECT id, name, attended, total_classes FROM subjects ORDER BY id ASC')
        subjects = cur.fetchall()
        return jsonify([{"id": s[0], "name": s[1], "attended": s[2], "total_classes": s[3]} for s in subjects])

@app.route('/api/subjects/<int:subject_id>', methods=['PUT', 'DELETE'])
def modify_subject(subject_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        data = request.json
        if 'name' in data:
            cur.execute('UPDATE subjects SET name = %s WHERE id = %s', (data['name'], subject_id))
        if 'attended' in data:
            cur.execute('UPDATE subjects SET attended = %s, total_classes = %s WHERE id = %s', (data['attended'], data['total_classes'], subject_id))
            # Log manual attendance if source is provided
            source = data.get('source', 'MANUAL')
            if source == 'MANUAL':
                status = data.get('status')
                if status in ('PRESENT', 'ABSENT'):
                    cur.execute('SELECT name FROM subjects WHERE id = %s', (subject_id,))
                    sub_row = cur.fetchone()
                    sub_name = sub_row[0] if sub_row else ''
                    cur.execute(
                        'INSERT INTO attendance_log (subject_id, subject_name, log_date, status, source) VALUES (%s, %s, %s, %s, %s)',
                        (subject_id, sub_name, datetime.date.today(), status, 'MANUAL')
                    )
        conn.commit()
        return jsonify({"message": "Subject updated."})
    elif request.method == 'DELETE':
        cur.execute('DELETE FROM timetable WHERE subject_id = %s', (subject_id,))
        cur.execute('DELETE FROM subjects WHERE id = %s', (subject_id,))
        conn.commit()
        return jsonify({"message": "Subject deleted."})

# --- TIMETABLE ROUTES ---
@app.route('/api/timetable', methods=['GET', 'POST'])
def handle_timetable():
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'POST':
        data = request.json
        subject_name = data.get('subject_name', '').strip()
        cur.execute('SELECT id FROM subjects WHERE name ILIKE %s', (subject_name,))
        sub = cur.fetchone()
        if sub:
            subject_id = sub[0]
        else:
            cur.execute('INSERT INTO subjects (name, attended, total_classes) VALUES (%s, 0, 0) RETURNING id', (subject_name,))
            subject_id = cur.fetchone()[0]

        cur.execute(
            '''INSERT INTO timetable (day_of_week, subject_id, start_time, end_time, teacher, notes) VALUES (%s, %s, %s, %s, %s, %s)''',
            (data['day_of_week'], subject_id, data['start_time'], data.get('end_time', ''), data.get('teacher', ''), data.get('notes', ''))
        )
        conn.commit()
        return jsonify({"message": "Class scheduled successfully."})

    elif request.method == 'GET':
        cur.execute('''SELECT t.id, t.day_of_week, s.name, t.start_time, t.end_time, t.teacher, t.notes FROM timetable t JOIN subjects s ON t.subject_id = s.id ORDER BY CASE t.day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 END, t.start_time ASC''')
        classes = cur.fetchall()
        schedule = []
        for c in classes:
            start_val = c[3]
            try:
                start_str = start_val.strftime("%I:%M %p") if start_val else ""
            except AttributeError:
                start_str = str(start_val)
            schedule.append({"id": c[0], "day_of_week": c[1], "subject_name": c[2], "start_time": start_str, "end_time": str(c[4]), "teacher": str(c[5]), "notes": c[6]})
        return jsonify(schedule)

@app.route('/api/timetable/<int:item_id>', methods=['PUT', 'DELETE'])
def modify_timetable(item_id):
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'PUT':
        data = request.json
        subject_name = data.get('subject_name', '').strip()
        cur.execute('SELECT id FROM subjects WHERE name ILIKE %s', (subject_name,))
        sub = cur.fetchone()
        if sub:
            subject_id = sub[0]
        else:
            cur.execute('INSERT INTO subjects (name, attended, total_classes) VALUES (%s, 0, 0) RETURNING id', (subject_name,))
            subject_id = cur.fetchone()[0]

        cur.execute(
            '''UPDATE timetable SET day_of_week=%s, subject_id=%s, start_time=%s, end_time=%s, teacher=%s, notes=%s WHERE id=%s''',
            (data['day_of_week'], subject_id, data['start_time'], data.get('end_time', ''), data.get('teacher', ''), data.get('notes', ''), item_id)
        )
        conn.commit()
        return jsonify({"message": "Class updated."})
    elif request.method == 'DELETE':
        cur.execute('DELETE FROM timetable WHERE id = %s', (item_id,))
        conn.commit()
        return jsonify({"message": "Class deleted."})

# --- RESEARCH BOT ROUTE ---
@app.route('/api/research', methods=['POST'])
def research_chat():
    query = request.json.get('query', '')
    if not query:
        return jsonify({"error": "You didn't ask anything."}), 400
    prompt = f"The user is asking: '{query}'. Explain this in a simple, highly explanatory, and easy-to-understand way. CRITICAL RULE: DO NOT use any Markdown formatting. Use standard plain text with normal paragraph breaks only."
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        return jsonify({"response": model.generate_content(prompt).text})
    except Exception as e:
        return jsonify({"error": f"Research failed: {str(e)}"}), 500

# --- ANALYTICS BOT ROUTE ---
@app.route('/api/analytics-chat', methods=['POST'])
def analytics_chat():
    data = request.json
    query = data.get('query', '')
    tasks = data.get('tasks', [])
    subjects = data.get('subjects', [])

    prompt = f"""
    You are an academic advisor AI built into a dashboard.
    Student Data - Tasks: {json.dumps(tasks)}, Subjects (Attendance): {json.dumps(subjects)}.
    The student is asking: "{query}"
    Answer them directly based strictly on their data. Keep it concise, punchy, and helpful. Do not use complex markdown, just plain text.
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        return jsonify({"response": model.generate_content(prompt).text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- AI ANALYTICS GENERATOR ---
@app.route('/api/ai-analytics', methods=['POST'])
def ai_analytics():
    data = request.json
    prompt = f"""
    You are a harsh, highly analytical academic advisor analyzing a student's progress.
    Tasks: {json.dumps(data.get('tasks', []))}
    Subjects (Attendance): {json.dumps(data.get('subjects', []))}

    Return ONLY a valid JSON object with this EXACT structure:
    {{
        "vibe_check": "A 1-sentence roast or praise.",
        "critical_warning": "Identify lowest attendance subject and state classes needed to hit 75%.",
        "action_items": ["Specific action 1", "Specific action 2", "Specific action 3"]
    }}
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
        parsed_data = json.loads(response.text)
        return jsonify(parsed_data)
    except Exception as e:
        return jsonify({"error": f"Failed to generate insights: {str(e)}"}), 500

# --- AI PARSER ROUTE ---
@app.route('/api/parse-timetable', methods=['POST'])
def parse_timetable():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded."}), 400
    custom_instructions = request.form.get('custom_prompt', '')
    
    try:
        file_bytes = request.files['image'].read()
        if not file_bytes:
            return jsonify({"error": "Uploaded image file is empty."}), 400
        img = PIL.Image.open(io.BytesIO(file_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # Resize high-resolution images to prevent timeout and excessive memory usage
        img.thumbnail((1024, 1024))
    except Exception as img_err:
        return jsonify({"error": f"Failed to process image file: {str(img_err)}"}), 400

    prompt = f"""
    Analyze the provided image of a college timetable.

    CRITICAL RULES - READ CAREFULLY:
    1. Extract the schedule SPECIFICALLY for SECTION A ONLY. Ignore all other sections. There should be exactly 3 classes per day (about 18 classes total).
    2. The "day_of_week" MUST be exactly one of these: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday".
    3. Identify the Subject Name. DO NOT extract "Section A" or "LUNCH" as a subject.
       - Expand "TC" to "Technical Communication".
       - Include "Lab" in the subject name if it's a lab class.
    4. Identify the Teacher's Name. The cell format is usually "Subject/Teacher" or "Subject / Teacher" (e.g., "AEM/KF"). Extract the Subject and Teacher separately.
    5. Keep the exact Start Time and End Time from the column headers (e.g., "09:00 AM").
    6. {custom_instructions if custom_instructions else "Leave the 'notes' field blank."}

    You MUST return a valid JSON array of objects using EXACTLY these keys:
    "day_of_week", "subject_name", "teacher", "start_time", "end_time", "notes"
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content([prompt, img])
        
        raw_text = response.text.strip()
        # Clean any accidental markdown fences
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed_data = json.loads(raw_text)

        conn = get_db_connection()
        cur = conn.cursor()
        classes_added = 0

        for item in parsed_data:
            subject_name = str(item.get('subject_name', '') or '').strip()
            if not subject_name or subject_name.upper() in ["SECTION A", "LUNCH"]:
                continue

            raw_day = str(item.get('day_of_week', 'Monday') or 'Monday').strip()
            clean_day = raw_day.capitalize() if raw_day.upper() != "THURSDAY" else "Thursday"

            cur.execute('SELECT id FROM subjects WHERE name ILIKE %s', (subject_name,))
            sub = cur.fetchone()
            if sub:
                subject_id = sub[0]
            else:
                cur.execute('INSERT INTO subjects (name, attended, total_classes) VALUES (%s, 0, 0) RETURNING id', (subject_name,))
                subject_id = cur.fetchone()[0]

            start_t = str(item.get('start_time', '') or '').strip()
            end_t = str(item.get('end_time', '') or '').strip()
            teacher = str(item.get('teacher', '') or '').strip()
            notes = str(item.get('notes', '') or '').strip()

            cur.execute('''INSERT INTO timetable (day_of_week, subject_id, start_time, end_time, teacher, notes) VALUES (%s, %s, %s, %s, %s, %s)''',
                        (clean_day, subject_id, start_t, end_t, teacher, notes))
            classes_added += 1

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": f"Successfully injected {classes_added} classes!"})
    except Exception as e:
        print("Error during parse_timetable:", e)
        return jsonify({"error": f"Failed to parse timetable: {str(e)}"}), 500

# --- BACKGROUND EMAIL SYNC WORKER ---
def background_email_sync():
    print("Background thread started. Hunting for emails...")

    conn = get_db_connection()
    cur = conn.cursor()
    today_date = datetime.date.today()

    cur.execute('SELECT 1 FROM sync_history WHERE sync_date = %s', (today_date,))
    if cur.fetchone():
        print("Double-Dip Prevented: Already synced today's attendance.")
        cur.close()
        conn.close()
        return

    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_APP_PASSWORD")

    if not email_user or not email_pass:
        print("Sync Failed: Email credentials missing in .env")
        cur.execute("UPDATE last_sync_info SET status='no_credentials' WHERE id=1")
        conn.commit()
        cur.close()
        conn.close()
        return

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(email_user, email_pass)
        mail.select("inbox")

        status, messages = mail.search(None, '(SUBJECT "Attendance Report")')
        email_ids = messages[0].split()

        if not email_ids:
            print("Sync Failed: No daily attendance emails found.")
            mail.logout()
            cur.execute("UPDATE last_sync_info SET status='no_email', last_sync_at=%s WHERE id=1", (datetime.datetime.now(IST),))
            conn.commit()
            cur.close()
            conn.close()
            return

        latest_email_id = email_ids[-1]
        status, msg_data = mail.fetch(latest_email_id, "(RFC822)")

        msg = email.message_from_bytes(msg_data[0][1])

        # Validate time window: Check if the email arrived today between 4 PM and 7 PM
        msg_date_str = msg.get('Date')
        if msg_date_str:
            msg_date = parsedate_to_datetime(msg_date_str).astimezone(IST)
            
            is_today = msg_date.date() == today_date
            is_in_window = 16 <= msg_date.hour <= 19
            
            if not (is_today and is_in_window):
                print(f"Sync Skipped: Latest attendance email arrived outside the 4 PM - 7 PM window or on a different day (Received: {msg_date.strftime('%Y-%m-%d %H:%M')}).")
                mail.logout()
                cur.close()
                conn.close()
                return

        html_content = ""

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    html_content += part.get_payload(decode=True).decode('utf-8', errors='ignore')
        else:
            if msg.get_content_type() == "text/html":
                html_content = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

        mail.logout()

        if not html_content:
            print("Sync Failed: No HTML content in the email.")
            cur.execute("UPDATE last_sync_info SET status='no_html', last_sync_at=%s WHERE id=1", (datetime.datetime.now(IST),))
            conn.commit()
            cur.close()
            conn.close()
            return

        soup = BeautifulSoup(html_content, 'html.parser')
        table = soup.find('table')

        if not table:
            print("Sync Failed: Could not find attendance table.")
            cur.execute("UPDATE last_sync_info SET status='no_table', last_sync_at=%s WHERE id=1", (datetime.datetime.now(IST),))
            conn.commit()
            cur.close()
            conn.close()
            return

        subject_aliases = {
            "data structures and algorithms lab": "DSA",
            "object oriented programming lab": "OOPS",
            "digital electronics": "DE",
            "software engineering": "SE",
            "sports/library/activity": "Sports",
            "digital electronics lab": "DE Lab",
            "advanced engineering mathematics": "AEM",
        }

        subjects_updated = 0

        for row in table.find_all('tr')[1:]:
            cols = row.find_all('td')

            if len(cols) >= 4:
                raw_subject_name = cols[2].text.strip()
                status_text = cols[3].text.strip().upper()

                subject_name = subject_aliases.get(raw_subject_name.lower(), raw_subject_name)

                cur.execute('SELECT id FROM subjects WHERE name ILIKE %s', (subject_name,))
                sub = cur.fetchone()

                if sub:
                    sub_id = sub[0]
                else:
                    cur.execute('INSERT INTO subjects (name, attended, total_classes) VALUES (%s, 0, 0) RETURNING id', (subject_name,))
                    sub_id = cur.fetchone()[0]

                if "PRESENT" in status_text:
                    cur.execute('UPDATE subjects SET attended = attended + 1, total_classes = total_classes + 1 WHERE id = %s', (sub_id,))
                    log_status = 'PRESENT'
                elif "ABSENT" in status_text:
                    cur.execute('UPDATE subjects SET total_classes = total_classes + 1 WHERE id = %s', (sub_id,))
                    log_status = 'ABSENT'
                else:
                    continue

                # Log to attendance_log
                cur.execute(
                    'INSERT INTO attendance_log (subject_id, subject_name, log_date, status, source) VALUES (%s, %s, %s, %s, %s)',
                    (sub_id, subject_name, today_date, log_status, 'EMAIL_SYNC')
                )
                subjects_updated += 1

        cur.execute('INSERT INTO sync_history (sync_date) VALUES (%s)', (today_date,))
        now_ist = datetime.datetime.now(IST)
        next_sync = now_ist.replace(hour=19, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
        cur.execute(
            "UPDATE last_sync_info SET status='success', last_sync_at=%s, next_sync_at=%s WHERE id=1",
            (now_ist, next_sync)
        )

        conn.commit()
        cur.close()
        conn.close()
        print(f"Auto-Sync Complete: Logged {subjects_updated} attendance records for {today_date}.")

    except Exception as e:
        print(f"Sync crashed: {str(e)}")
        try:
            conn.rollback()
            cur.execute("UPDATE last_sync_info SET status='error' WHERE id=1")
            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            pass

# --- ATTENDANCE LOG ROUTES ---
@app.route('/api/force-sync', methods=['POST'])
def force_sync():
    try:
        background_email_sync()
        return jsonify({"message": "Sync triggered successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/attendance-log', methods=['GET'])
def get_attendance_log():
    subject_id = request.args.get('subject_id')
    limit = request.args.get('limit', 60)
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if subject_id:
            cur.execute(
                'SELECT id, subject_name, log_date, status, source, created_at FROM attendance_log WHERE subject_id = %s ORDER BY log_date DESC, created_at DESC LIMIT %s',
                (subject_id, limit)
            )
        else:
            cur.execute(
                'SELECT id, subject_name, log_date, status, source, created_at FROM attendance_log ORDER BY log_date DESC, created_at DESC LIMIT %s',
                (limit,)
            )
        rows = cur.fetchall()
        result = [
            {
                "id": r[0],
                "subject_name": r[1],
                "log_date": r[2].isoformat() if r[2] else None,
                "status": r[3],
                "source": r[4],
                "created_at": r[5].isoformat() if r[5] else None
            }
            for r in rows
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/sync-status', methods=['GET'])
def get_sync_status():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute('SELECT last_sync_at, next_sync_at, status FROM last_sync_info WHERE id = 1')
        row = cur.fetchone()
        if row:
            return jsonify({
                "last_sync_at": row[0].isoformat() if row[0] else None,
                "next_sync_at": row[1].isoformat() if row[1] else None,
                "status": row[2]
            })
        return jsonify({"last_sync_at": None, "next_sync_at": None, "status": "never"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- USP: THE BUNK RUNWAY CALCULATOR ---
@app.route('/api/bunk-runway', methods=['GET'])
def bunk_runway():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute('SELECT id, name, attended, total_classes FROM subjects')
    subjects_raw = cur.fetchall()

    subjects = {}
    bunk_bank = []

    for row in subjects_raw:
        sub_id, name, attended, total = row
        subjects[sub_id] = {"name": name, "attended": attended, "total": total}

        if total > 0:
            safe_bunks = math.floor((4 * attended / 3) - total)
            percentage = round((attended / total) * 100, 1)
        else:
            safe_bunks = 0
            percentage = 0

        bunk_bank.append({
            "name": name,
            "safe_bunks": safe_bunks,
            "percentage": percentage
        })

    bunk_bank.sort(key=lambda x: x['safe_bunks'])

    cur.execute('SELECT day_of_week, subject_id FROM timetable')
    schedule = {"Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [], "Sunday": []}
    for day, sub_id in cur.fetchall():
        clean_day = str(day).strip().capitalize()
        if clean_day in schedule:
            schedule[clean_day].append(sub_id)

    cur.close()
    conn.close()

    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    days_skipped = 0
    simulated_date = datetime.datetime.today()
    killer_subject = None

    while days_skipped < 30:
        simulated_date += datetime.timedelta(days=1)
        current_day_name = days_of_week[simulated_date.weekday()]

        failed_today = False
        for sub_id in schedule[current_day_name]:
            if sub_id in subjects:
                subjects[sub_id]["total"] += 1
                new_percentage = (subjects[sub_id]["attended"] / subjects[sub_id]["total"]) * 100
                if new_percentage < 75.0:
                    killer_subject = subjects[sub_id]["name"]
                    failed_today = True
                    break
        if failed_today:
            break
        days_skipped += 1

    target_date = simulated_date.strftime('%A, %b %d')

    return jsonify({
        "days_skipped": days_skipped,
        "killer_subject": killer_subject,
        "target_date": target_date,
        "bunk_bank": bunk_bank
    })

# --- APSCHEDULER: AUTO-SYNC AT 7 PM IST DAILY ---
scheduler = BackgroundScheduler(timezone=IST)
scheduler.add_job(
    func=background_email_sync,
    trigger=CronTrigger(hour=19, minute=0, timezone=IST),
    id='daily_email_sync',
    name='Daily Gmail Attendance Sync',
    replace_existing=True
)
scheduler.start()
print("APScheduler started. Daily sync scheduled for 7:00 PM IST.")

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)