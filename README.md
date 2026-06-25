# Durian Leaf Disease Detection

A web application for diagnosing durian leaf diseases from images using Deep Learning (MobileNetV2), with severity assessment powered by OpenCV.

---

## Features

- Classify durian leaf diseases across 6 categories
- Assess disease severity (Low / Medium / High) via HSV color segmentation
- Support batch image upload up to 50 images per request
- User authentication system (Register / Login / Logout)
- Diagnosis history with filter and sort

## Supported Disease Classes

| Class | Description |
|---|---|
| Leaf Algal | Algal leaf spot |
| Leaf Blight | Leaf blight |
| Leaf Colletotrichum | Anthracnose |
| Leaf Phomopsis | Phomopsis leaf spot |
| Leaf Rhizoctonia | Rhizoctonia leaf blight |
| Leaf Healthy | No disease detected |

---

## Tech Stack

- **Backend:** Python, Flask
- **AI / ML:** TensorFlow 2.16, MobileNetV2, OpenCV 4.9, scikit-learn
- **Database:** MySQL / MariaDB
- **Frontend:** HTML, CSS, JavaScript
- **Storage:** ImgBB API (cloud image hosting)

---

## Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/tang1114/Durian-Disease-Detection.git
cd Durian-Disease-Detection
git checkout dev
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Set up environment variables**

Create a `.env` file in the root directory:
```env
SECRET_KEY=your_secret_key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=durian_db
IMGBB_API_KEY=your_imgbb_key
```

**4. Set up the database**

Import the SQL schema from the `database/` folder into your MySQL/MariaDB instance:
```bash
mysql -u root -p durian_db < database/schema.sql
```

**5. Place the trained model**

Put the model file at:
```
model/best_mobilenetv2_ultra.keras
```

**6. Run the application**
```bash
python app.py
```

Open your browser at `http://localhost:5000`

---

## Usage

1. Register an account at `/register`
2. Log in at `/login`
3. Go to the **Diagnosis** page and upload durian leaf images
4. Click **Start Analysis** to receive results
5. View all past diagnoses at the **History** page

---

## Project Structure

```
Durian-Disease-Detection/
├── app.py                          # Flask backend & API routes
├── predictor.py                    # Model inference & severity analysis
├── requirements.txt
├── Model_Durian_Leaf.ipynb         # Model training notebook
├── TestCase_Durian-Disease-Detection.pdf
├── model/
│   └── best_mobilenetv2_ultra.keras
├── database/                       # SQL schema
├── static/                         # CSS, JS, images
└── templates/                      # HTML pages
```

---

## Testing

Manual test cases are documented in `TestCase_Durian-Disease-Detection.pdf`, covering authentication flows, image upload validation, prediction edge cases, and history filtering.
