import os
import psycopg2
from dotenv import load_dotenv

# Load your secrets
load_dotenv()

def init_db():
    # Connect to the vault
    conn = psycopg2.connect(
        host='localhost',
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD']
    )
    cur = conn.cursor()
    
    # Execute the master schema
    cur.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            due_date TIMESTAMP,
            is_completed BOOLEAN DEFAULT FALSE
        );
        
        CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            attended INT DEFAULT 0,
            total_classes INT DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS timetable (
            id SERIAL PRIMARY KEY,
            day_of_week VARCHAR(15) NOT NULL,
            subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
            start_time TIME NOT NULL,
            notes TEXT
        );
    ''')
    
    # Save the changes and close the door
    conn.commit()
    cur.close()
    conn.close()
    print("Database tables forged successfully. You have no excuses now.")

if __name__ == '__main__':
    init_db()