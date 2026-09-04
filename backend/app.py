import os
import imaplib
import email
from email.header import decode_header
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

load_dotenv()
app = Flask(__name__)
CORS(app)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

GEMINI_MODEL = 'gemini-3.6-flash'

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def upgrade_db():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE timetable ADD COLUMN end_time VARCHAR(20) DEFAULT '';")
        cur.execute("ALTER TABLE timetable ADD COLUMN teacher VARCHAR(100) DEFAULT '';")
        conn.commit()
    except Exception:
        conn.rollback() 

    try:
        cur.execute("DELETE FROM timetable WHERE subject_id IN (SELECT id FROM subjects WHERE trim(name) = '');")
        cur.execute("DELETE FROM subjects WHERE trim(name) = '';")
        conn.commit()
    except Exception:
        conn.rollback()

    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255),
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        conn.commit()
    except Exception:
        conn.rollback()

    # THE NEW SHIELD: Table to prevent double-dipping the email sync
    try:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS sync_history (
                sync_date DATE PRIMARY KEY
            );
        ''')
        conn.commit()
    except Exception:
        conn.rollback()

    finally:
        cur.close()
        conn.close()

with app.app_context():
    upgrade_db()

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
        cur.execute('INSERT INTO notes (title, content) VALUES (%s, %s) RETURNING id, title, content', (data.get('title', 'Untitled'), data.get('content', '')))
        n = cur.fetchone()
        conn.commit()
        return jsonify({"id": n[0], "title": n[1], "content": n[2]})
    elif request.method == 'GET':
        cur.execute('SELECT id, title, content FROM notes ORDER BY id DESC')
        notes = cur.fetchall()
        return jsonify([{"id": n[0], "title": n[1], "content": n[2]} for n in notes])

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    conn = get_db_connection()
    cur = conn.cursor()
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
            try: start_str = start_val.strftime("%I:%M %p") if start_val else ""
            except AttributeError: start_str = str(start_val)
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
    if not query: return jsonify({"error": "You didn't ask anything."}), 400
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
    if 'image' not in request.files: return jsonify({"error": "No image uploaded."}), 400
    custom_instructions = request.form.get('custom_prompt', '')
    img = PIL.Image.open(io.BytesIO(request.files['image'].read()))

    prompt = f"""
    Analyze the provided image of a college timetable.

    CRITICAL RULES - READ CAREFULLY:
    1. Extract the schedule SPECIFICALLY for SECTION A ONLY. Ignore all other sections. There should be exactly 3 classes per day (about 18 classes total).
    2. The "day_of_week" MUST be exactly one of these: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday".
    3. Identify the Subject Name. DO NOT extract "Section A" or "LUNCH" as a subject.
    4. Identify the Teacher's Name (usually separated by a slash).
    5. Keep the exact Start Time and End Time from the column headers (e.g., "09:00 AM").
    6. {custom_instructions if custom_instructions else "Leave the 'notes' field blank."}

    You MUST return a valid JSON array of objects using EXACTLY these keys:
    "day_of_week", "subject_name", "teacher", "start_time", "end_time", "notes"
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL, generation_config={"response_mime_type": "application/json"})
        response = model.generate_content([prompt, img])
        parsed_data = json.loads(response.text)

        conn = get_db_connection()
        cur = conn.cursor()
        classes_added = 0

        for item in parsed_data:
            subject_name = item.get('subject_name', '').strip()
            if not subject_name or subject_name.upper() in ["SECTION A", "LUNCH"]: 
                continue

            raw_day = item.get('day_of_week', 'Monday').strip()
            clean_day = raw_day.capitalize() if raw_day.upper() != "THURSDAY" else "Thursday"

            cur.execute('SELECT id FROM subjects WHERE name ILIKE %s', (subject_name,))
            sub = cur.fetchone()
            if sub: 
                subject_id = sub[0]
            else:
                cur.execute('INSERT INTO subjects (name, attended, total_classes) VALUES (%s, 0, 0) RETURNING id', (subject_name,))
                subject_id = cur.fetchone()[0]

            cur.execute('''INSERT INTO timetable (day_of_week, subject_id, start_time, end_time, teacher, notes) VALUES (%s, %s, %s, %s, %s, %s)''', 
                        (clean_day, subject_id, item.get('start_time', ''), item.get('end_time', ''), item.get('teacher', ''), item.get('notes', '')))
            classes_added += 1

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": f"Successfully injected {classes_added} classes!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- THE GHOST WORKER (Runs in the background) ---
def background_email_sync():
    print("Background thread started. Hunting for emails...")
    
    conn = get_db_connection()
    cur = conn.cursor()
    today_date = datetime.date.today()

    # THE SHIELD: Check if we already synced today
    cur.execute('SELECT 1 FROM sync_history WHERE sync_date = %s', (today_date,))
    if cur.fetchone():
        print("Double-Dip Prevented: You already synced today's attendance.")
        cur.close()
        conn.close()
        return

    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_APP_PASSWORD")

    if not email_user or not email_pass:
        print("Sync Failed: Email credentials missing in .env")
        cur.close()
        conn.close()
        return

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(email_user, email_pass)
        mail.select("inbox")

        status, messages = mail.search(None, '(SUBJECT "Daily Attendance Report")')
        email_ids = messages[0].split()

        if not email_ids:
            print("Sync Failed: No daily attendance emails found.")
            mail.logout()
            cur.close()
            conn.close()
            return

        latest_email_id = email_ids[-1]
        status, msg_data = mail.fetch(latest_email_id, "(RFC822)")

        msg = email.message_from_bytes(msg_data[0][1])
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
            print("Sync Failed: No HTML table found in the email.")
            cur.close()
            conn.close()
            return

        soup = BeautifulSoup(html_content, 'html.parser')
        table = soup.find('table')
        
        if not table:
            print("Sync Failed: Could not find the attendance table.")
            cur.close()
            conn.close()
            return

        # THE BULLETPROOF ALIAS MAPPER (Everything lowercased)
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

                # Force lowercase lookup to destroy case-sensitivity
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
                elif "ABSENT" in status_text:
                    cur.execute('UPDATE subjects SET total_classes = total_classes + 1 WHERE id = %s', (sub_id,))
                
                subjects_updated += 1

        # Log today's successful sync to block the double-dip
        cur.execute('INSERT INTO sync_history (sync_date) VALUES (%s)', (today_date,))
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"Boom. Background Sync Complete: Logged {subjects_updated} classes.")

    except Exception as e:
        print(f"Background thread crashed: {str(e)}")
        if not conn.closed:
            conn.rollback()
            cur.close()
            conn.close()

# --- USP: LIVE EMAIL SYNC ROUTE (Instant Return) ---
@app.route('/api/sync-email', methods=['POST'])
def sync_email():
    thread = threading.Thread(target=background_email_sync)
    thread.start()
    return jsonify({"message": "Sync started in the background! Your dashboard will update shortly."})


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

if __name__ == '__main__':
    app.run(debug=True)