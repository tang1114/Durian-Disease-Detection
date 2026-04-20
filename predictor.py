import tensorflow as tf
import numpy as np
from PIL import Image
import os

# หาที่อยู่ปัจจุบันของไฟล์ predictor.py แล้วต่อด้วยโฟลเดอร์ model
base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, "model", "durian_model_clean.keras")

model = tf.keras.models.load_model(model_path)

class_names = [
    "Leaf_Algal",
    "Leaf_Blight",
    "Leaf_Colletotrichum",
    "Leaf_Healthy",
    "Leaf_Phomopsis",
    "Leaf_Rhizoctonia"
]

def predict_image(path):
    img = Image.open(path).convert('RGB').resize((224,224))
    
    img = np.array(img) 
    
    img = np.expand_dims(img, axis=0)

    preds = model.predict(img)
    conf = float(np.max(preds))
    cls = class_names[np.argmax(preds)]

    # --- แก้ไขตรงนี้ ---
    if cls == "Leaf_Healthy":
        sev = "Safe"
    else:
        if conf > 0.85:
            sev = "High"
        elif conf > 0.65:
            sev = "Medium"
        else:
            sev = "Low"

    return {
        "prediction": cls,
        "confidence": conf,
        "severity": sev
    }