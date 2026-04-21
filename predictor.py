import tensorflow as tf
import numpy as np
from PIL import Image
import os
import cv2  # 🔥 เพิ่ม OpenCV เข้ามา

# หาที่อยู่ปัจจุบันของไฟล์ predictor.py แล้วต่อด้วยโฟลเดอร์ model
base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, "model", "best_mobilenetv2_ultra.keras")

model = tf.keras.models.load_model(model_path)

class_names = [
    "Leaf_Algal",
    "Leaf_Blight",
    "Leaf_Colletotrichum",
    "Leaf_Healthy",
    "Leaf_Phomopsis",
    "Leaf_Rhizoctonia"
]

# 🔥 ฟังก์ชันใหม่: คำนวณความรุนแรงด้วย OpenCV
def calculate_severity_cv2(image_path):
    # โหลดรูปภาพ
    img = cv2.imread(image_path)
    if img is None:
        return "Low" # กันเหนียวเผื่อโหลดรูปไม่ได้
    
    # ย่อรูปนิดหน่อยให้คำนวณไวขึ้น
    img = cv2.resize(img, (400, 400))
    
    # แปลงสีเป็น HSV (เหมาะกับการแยกแยะวัตถุด้วยสี)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # 1. จับภาพ "ใบไม้ทั้งหมด" (โทนสีเขียว, เหลือง, น้ำตาล, ส้ม) ตัดพื้นหลังออก
    # ช่วงสี Hue ประมาณ 5-95 ครอบคลุมสีของใบไม้และรอยโรคส่วนใหญ่
    lower_leaf = np.array([5, 25, 25])
    upper_leaf = np.array([95, 255, 255])
    leaf_mask = cv2.inRange(hsv, lower_leaf, upper_leaf)
    
    # 2. จับภาพเฉพาะ "ส่วนที่แข็งแรง" (โทนสีเขียวเท่านั้น)
    lower_green = np.array([35, 25, 25])
    upper_green = np.array([95, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # นับจำนวนพิกเซล
    total_leaf_pixels = cv2.countNonZero(leaf_mask)
    healthy_pixels = cv2.countNonZero(green_mask)
    
    # ป้องกัน error กรณีหารด้วย 0 (เช่น รูปไม่มีใบไม้เลย)
    if total_leaf_pixels == 0:
        return "Low"
        
    # พื้นที่รอยโรค = พื้นที่ใบทั้งหมด - พื้นที่สีเขียว
    disease_pixels = total_leaf_pixels - healthy_pixels
    disease_pixels = max(0, disease_pixels) # กันค่าติดลบ
    
    # คิดเป็นเปอร์เซ็นต์ความเสียหาย
    damage_ratio = (disease_pixels / total_leaf_pixels) * 100
    
    # 🔥 กำหนดเกณฑ์ความรุนแรง (นายปรับตัวเลข % ตรงนี้ได้ตามต้องการ)
    if damage_ratio > 40:      # เสียหายมากกว่า 40% = หนัก
        return "High"
    elif damage_ratio > 15:    # เสียหาย 15% - 40% = ปานกลาง
        return "Medium"
    else:                      # เสียหายน้อยกว่า 15% = น้อย
        return "Low"


def predict_image(path):
    img = Image.open(path).convert('RGB').resize((224,224))
    
    img_array = np.array(img) 
    img_array = img_array / 255.0 
    
    img_array = np.expand_dims(img_array, axis=0)

    preds = model.predict(img_array)
    conf = float(np.max(preds))
    cls = class_names[np.argmax(preds)]

    # --- เรียกใช้ OpenCV คำนวณความรุนแรง ---
    if cls == "Leaf_Healthy":
        sev = "Safe"
    else:
        # ส่ง Path ของรูปไปให้ OpenCV วิเคราะห์เปอร์เซ็นต์พื้นที่รอยโรค
        sev = calculate_severity_cv2(path)

    return {
        "prediction": cls,
        "confidence": conf,
        "severity": sev
    }