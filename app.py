from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import os
from dotenv import load_dotenv
import uuid
import requests
from predictor import predict_image

load_dotenv()

app = Flask(__name__)

# เพิ่ม Secret Key สำหรับการใช้งาน Session (จำเป็นมากสำหรับระบบ Login)
app.secret_key = os.getenv("SECRET_KEY", "super_secret_key_for_durian_project") 

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ฟังก์ชันสำหรับทดสอบต่อ Database
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

# 1. ทดสอบว่า Flask รันขึ้นไหม
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    # ถ้าเป็นการดึงหน้าเว็บปกติ
    if request.method == 'GET':
        return render_template('register.html')
    
    # ถ้าเป็นการกดปุ่ม Submit เพื่อสมัครสมาชิก
    try:
        # รองรับทั้งการส่งข้อมูลแบบ JSON และ Form ทั่วไป
        data = request.json if request.is_json else request.form
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not username or not email or not password:
            return jsonify({"status": "error", "message": "กรุณากรอกข้อมูลให้ครบถ้วน"}), 400

        # เข้ารหัสผ่านก่อนเก็บลงฐานข้อมูล
        hashed_password = generate_password_hash(password)

        conn = get_db_connection()
        cursor = conn.cursor()

        # บันทึกข้อมูลลงตาราง Users
        sql = "INSERT INTO Users (username, email, password) VALUES (%s, %s, %s)"
        cursor.execute(sql, (username, email, hashed_password))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"status": "success", "message": "สมัครสมาชิกสำเร็จ!"})

    except mysql.connector.IntegrityError:
        # ดักจับ Error ในกรณีที่ Email หรือ Username นี้มีคนใช้ไปแล้ว
        return jsonify({"status": "error", "message": "Email หรือ Username นี้มีในระบบแล้ว"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    try:
        data = request.json if request.is_json else request.form
        email = data.get('email')
        password = data.get('password')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ค้นหา User จาก Email
        cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        # เช็คว่ามี user ไหม และ รหัสผ่านที่กรอกมาตรงกับที่เข้ารหัสไว้หรือเปล่า
        if user and check_password_hash(user['password'], password):
            # เข้าสู่ระบบสำเร็จ! เก็บ ID และชื่อผู้ใช้ไว้ใน Session
            session['user_id'] = user['user_id']
            session['username'] = user['username']
            
            return jsonify({"status": "success", "message": "เข้าสู่ระบบสำเร็จ!"})
        else:
            return jsonify({"status": "error", "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"}), 401

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# เพิ่ม Route สำหรับการออกจากระบบ
@app.route('/logout')
def logout():
    session.clear() # ลบข้อมูลทั้งหมดออกจาก Session
    return redirect(url_for('login')) # เด้งกลับไปหน้า login

@app.route('/all-diseases')
def all_diseases():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        # 1. กรอง Leaf_Healthy ออกตั้งแต่ตอนดึงข้อมูล (เร็วและประหยัดเมมโมรี่สุด)
        cursor.execute("SELECT disease_id, disease_name, description FROM Disease_Types WHERE disease_name != 'Leaf_Healthy'")
        all_diseases_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return render_template('AllDiseases.html', diseases=all_diseases_data)
        
    except Exception as e:
        print(f"Error fetching diseases: {e}")
        return render_template('AllDiseases.html', diseases=[])

@app.route('/diagnosis')
def diagnosis():
    # ถ้าไม่มี user_id ใน session แปลว่ายังไม่ล็อกอิน
    if 'user_id' not in session:
        return redirect(url_for('login')) # เด้งไปหน้า login
    
    # ถ้าล็อกอินแล้ว อนุญาตให้เข้าหน้า diagnosis ได้
    return render_template('diagnosis.html', username=session.get('username'))

@app.route('/history')
def history():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # ใช้คำสั่ง JOIN เพื่อเชื่อมตาราง Diagnoses กับ Disease_Types
        # และใช้ AS prediction เพื่อให้ชื่อตัวแปรตรงกับหน้า history.html ที่เราเขียนไว้
        cursor.execute("""
            SELECT 
                d.image_url, 
                dt.disease_name AS prediction, 
                d.confidence, 
                d.severity, 
                d.created_at 
            FROM Diagnoses d
            JOIN Disease_Types dt ON d.disease_id = dt.disease_id
            WHERE d.user_id = %s 
            ORDER BY d.created_at DESC
        """, (session['user_id'],))
        
        user_history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return render_template('history.html', history=user_history, username=session.get('username'))
        
    except Exception as e:
        print(f"Database Error in History: {e}")
        return "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ", 500

# 2. ทดสอบว่า Flask คุยกับ MariaDB รู้เรื่องไหม
@app.route('/test-db')
def test_db():
    try:
        # ลองเชื่อมต่อและดึงรายชื่อตารางออกมา
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # ส่งผลลัพธ์กลับไปโชว์ที่หน้าเว็บ
        return jsonify({
            "status": "success", 
            "message": "Connected to MariaDB!", 
            "tables_found": tables
        })
    except Exception as e:
        # ถ้าต่อไม่สำเร็จ จะโชว์ Error สีแดงๆ ให้เรารู้ทันที
        return jsonify({
            "status": "error", 
            "message": "Cannot connect to database", 
            "error_detail": str(e)
        })
#API /predict
@app.route('/predict', methods=['POST'])
def predict():
    # ตรวจสอบก่อนว่า User ล็อกอินหรือยัง
    if 'user_id' not in session:
        return jsonify({"status": "error", "message": "กรุณาเข้าสู่ระบบก่อนใช้งาน"}), 401

    try:
        files = request.files.getlist("files")
        results = []

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        # ดึง ID ของผู้ใช้ปัจจุบันจาก Session ของ Flask
        current_user_id = session['user_id'] 

        for file in files:
            if file.filename == '':
                continue

            # 1. เซฟไฟล์ลงเครื่องแบบ "ชั่วคราว"
            temp_path = os.path.join(UPLOAD_FOLDER, "temp_" + file.filename)
            file.save(temp_path)

            # 2. นำไฟล์เข้า Model ทำนายผล
            result = predict_image(temp_path)
            predicted_disease_name = result['prediction']
            confidence_score = result['confidence']

            #  เพิ่มเงื่อนไขดักภาพที่ไม่ใช่ใบทุเรียนตรงนี้!
            if confidence_score < 0.40:
                os.remove(temp_path) # ลบไฟล์ชั่วคราวทิ้งทันที
                return jsonify({
                    "status": "error",
                    "message": f"ภาพนี้อาจไม่ใช่ใบทุเรียน หรือมองไม่ชัดเจน (ความมั่นใจเพียง {int(confidence_score * 100)}%) กรุณาอัปโหลดรูปใหม่อีกครั้ง"
                }), 400

            # 3. อัปโหลดรูปลง ImgBB
            imgbb_url = "https://api.imgbb.com/1/upload"
            imgbb_key = os.getenv("IMGBB_API_KEY") # ไปดึงคีย์จากไฟล์ .env
            
            with open(temp_path, "rb") as img_file:
                payload = {"key": imgbb_key}
                files_data = {"image": img_file}
                res = requests.post(imgbb_url, data=payload, files=files_data)
            
            # เช็คว่าอัปโหลดสำเร็จไหม
            if res.status_code == 200:
                # ได้ URL ของรูปมาแล้ว!
                hosted_image_url = res.json()["data"]["url"] 
            else:
                raise Exception("อัปโหลดรูปลง ImgBB ไม่สำเร็จ")

            # 4. ลบไฟล์ชั่วคราวทิ้ง เพื่อประหยัดพื้นที่
            os.remove(temp_path)

            # 5. ค้นหา disease_id และบันทึกลง Database
            cursor.execute("SELECT disease_id FROM Disease_Types WHERE disease_name = %s", (predicted_disease_name,))
            disease_row = cursor.fetchone()
            
            if disease_row:
                disease_id = disease_row['disease_id']
                
                # บันทึก URL แทนชื่อไฟล์
                sql = """INSERT INTO Diagnoses (user_id, disease_id, image_url, confidence, severity)
                         VALUES (%s, %s, %s, %s, %s)"""
                val = (current_user_id, disease_id, hosted_image_url, result['confidence'], result['severity'])
                cursor.execute(sql, val)
                conn.commit()
            else:
                raise Exception(f"ไม่พบข้อมูลโรค {predicted_disease_name} ในฐานข้อมูล")

            # แนบ URL ส่งกลับไปให้ Frontend เอาไปโชว์
            result['image_url'] = hosted_image_url
            results.append(result)

        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "results": results
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return app.send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    # รันโหมด debug เวลาแก้โค้ดเซิร์ฟเวอร์จะรีสตาร์ทให้เอง
    app.run(debug=True, port=5000)
