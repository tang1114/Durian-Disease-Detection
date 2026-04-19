# from fastapi import FastAPI, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse

# import numpy as np
# import cv2
# import joblib
# from features import extract_enhanced_features

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # เสิร์ฟ static ที่ /static เท่านั้น
# app.mount("/static", StaticFiles(directory="static"), name="static")

# # หน้าเว็บ = / 
# @app.get("/")
# def root():
#     return FileResponse("static/index.html")


# # โหลดโมเดล
# bundle = joblib.load("models/multiclass_best.joblib")
# model = bundle["model"]
# le = bundle["label_encoder"]


# @app.post("/predict")
# async def predict(file: UploadFile = File(...)):
#     img_bytes = await file.read()
#     img_np = np.frombuffer(img_bytes, np.uint8)
#     img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

#     feats = extract_enhanced_features(img).reshape(1, -1)

#     pred_idx = model.predict(feats)[0]
#     class_name = le.inverse_transform([pred_idx])[0]

#     # Probabilities
#     prob_dict = {}
#     if hasattr(model, "predict_proba"):
#         probs = model.predict_proba(feats)[0]
#         prob_dict = {
#             le.inverse_transform([i])[0]: float(probs[i])
#             for i in range(len(probs))
#         }

#     return {
#         "predicted": class_name,
#         "probabilities": prob_dict,
#     }

from flask import Flask, jsonify , render_template
import mysql.connector
import os
from dotenv import load_dotenv

# โหลดตัวแปรจากไฟล์ .env
load_dotenv()

app = Flask(__name__)

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

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/all-diseases')
def all_diseases():
    return render_template('AllDiseases.html') 

@app.route('/diagnosis')
def diagnosis():
    return render_template('diagnosis.html') 

@app.route('/history')
def history():
    return render_template('history.html') 

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

if __name__ == '__main__':
    # รันโหมด debug เวลาแก้โค้ดเซิร์ฟเวอร์จะรีสตาร์ทให้เอง
    app.run(debug=True, port=5000)
