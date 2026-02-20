## 🚅 Train Inspection Mobile System

A professional, full-stack mobile suite designed for rigorous railway coach audits. Developed with a focus on data integrity, offline resilience, and a smooth user experience using **React Native (Expo)**, **Node.js (Express)**, and **MySQL**.

---

## 🏗️ 1. Project Overview
This application digitizes the manual inspection process for Indian Railways. It guides an inspector through a logical flow: selecting a specific train and coach, choosing an area of focus (e.g., Exterior), and completing a mandatory checklist.

### Core Architecture
- **Hierarchical Intelligence**: Navigates from high-level fleet selection to granular question-level data.
- **Enterprise Snapshot Hybrid**: An advanced database design that preserves the state of master data (Train/Coach numbers) within the audit records at the point of submission.
- **Auto-Drafting**: Real-time progress persistence ensures no data is lost during accidental app closes.
- **Proof-of-Defect**: Mandatory image capture and reason-tagging for every failed check.
- **Atomic Submissions**: Transactional backend logic ensures that partial audits never corrupt the database.

---

## 🛠️ 2. Technical Stack

### Frontend (User Experience)
- **React Native (Expo SDK 54)**
- **Navigation**: React Navigation 6 (Stack-based)
- **State Engine**: Context API + Custom Hooks for global store
- **Local Database**: `AsyncStorage` for state persistence
- **Networking**: Axios with centralized API config

### Backend (Data Engine)
- **Node.js & Express**: Clean, modular API architecture
- **Sequelize ORM**: Schema definition and transactional logic
- **Middleware**: JSON Parsing, CORS, and request logging

### Database (Persistence)
- **MySQL**: Relational storage optimized with indexing for audit trails.

---

## 📁 3. Humanized Folder Structure

```text
Premade_Assignment/
├── backend/                # Server-side logic
│   ├── config/             # Database & environment configuration
│   ├── controllers/        # AuditController.js (The Brain)
│   ├── routes/             # AuditRoutes.js (API Definition)
│   ├── models/             # Database Schemas (InspectionAnswer.js etc.)
│   ├── seedEndToEnd.js     # Master data initialization script
│   └── server.js           # Main application entry point
├── src/                    # Mobile App source code
│   ├── api/                # api.js (Backend communication layer)
│   ├── components/         # Reusable UI (QuestionCard.js, CustomModals)
│   ├── navigation/         # Routing & Screen Transitions
│   ├── screens/            # Main Views (Checklist, Summary, Selectors)
│   ├── store/              # StoreContext.js (Global State & Offline Logic)
│   └── utils/              # Utility & Formatting helpers
└── App.js                  # Root Component
```

---

## 🚀 4. Step-by-Step Setup Guide

### Prerequisites
- **Node.js**: v18 or higher.
- **MySQL Server**: (XAMPP recommended for Windows users).
- **Mobile Device**: Expo Go app installed (available on Play Store/App Store).

### A. Database Preparation
1. Open your MySQL client (phpMyAdmin or Workbench).
2. Create a new database named `inspection_db`.
3. Open `backend/config/db.js` and update your username/password (default is `root` / `root`).

### B. Starting the Server
1. Open a terminal in the `backend/` folder.
2. Run `npm install` to grab dependencies.
3. Run `node seedEndToEnd.js` — This is crucial! It populates the trains, coaches, and questions.
4. Run `node server.js` to go live.
   - Note the IP address shown in the terminal (e.g., `192.168.1.XX`).

### C. Launching the App
1. Go to the root `Premade_Assignment/` directory.
2. Run `npm install`.
3. Open `src/api/api.js` and set the `BASE_URL` to your computer's IP (e.g., `http://192.168.1.XX:3000/api`).
4. Run `npx expo start`.
5. Scan the QR code with your phone or run on an emulator.

---

## 🔗 5. Interactive API Reference

| Human-Friendly Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/train-list` | `GET` | Fetches available trains from the fleet. |
| `/api/coach-list` | `GET` | Filters coaches by train ID. |
| `/api/areas` | `GET` | Retrieves inspection categories (Exterior, etc.). |
| `/api/checklist` | `GET` | Pulls the dynamic question set. |
| `/api/save-inspection` | `POST` | Persists the final audit with snapshotted metadata. |

---

## ✅ 6. Built-in Quality Controls
- **Smart Validation**: Blocks submission if a "NO" check lacks a reason or a photo.
- **Visual Feedback**: A persistent progress bar shows the user exactly how much is left.
- **Deterministic Summary**: A final review screen summarizes all findings before database commit.
- **Self-Healing State**: If the app is killed, the inspector can resume from the exact same question.

---

Crafted for Reliability. 🏁
