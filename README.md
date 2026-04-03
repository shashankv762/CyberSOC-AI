# 🛡️ CyberSOC AI Platform

![CyberSOC Banner](https://img.shields.io/badge/CyberSOC-AI--Powered_Security-0ea5e9?style=for-the-badge)

CyberSOC is a real-time, AI-driven Security Operations Center (SOC) platform. Built with a modern React frontend and a robust Node.js/Express backend, it monitors system processes, network connections, and authentication logs. It utilizes custom machine learning algorithms to detect anomalies, generate alerts, and provide actionable mitigations.

## ✨ Key Features

- **🤖 AI Anomaly Detection:** Automated threat detection using custom ML feature extraction and prediction.
- **🛡️ Real-Time System Monitoring:** Live tracking of host system processes (`ps`) and network connections (`ss`).
- **📊 Interactive Dashboard:** Beautiful, responsive UI with live charts, event distributions, and login activity tracking.
- **🔍 Advanced Log Filtering:** Filter live logs by event type, source IP, and anomaly status directly from the UI.
- **🚨 Smart Alerts:** Automated alert generation with AI-explained reasons and suggested mitigation steps.
- **💬 Security Chatbot:** Integrated assistant for security context and queries.
- **🔒 Secure Authentication & User Management:** Integrated with Firebase Authentication (Google Sign-In) and Firestore for role-based access control (RBAC).

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Recharts (Data Visualization)
- Lucide React (Icons)
- Firebase SDK (Auth & Firestore)

**Backend:**
- Node.js & Express
- Firebase Admin SDK (Token verification & Firestore access)
- SQLite (better-sqlite3) for local log storage
- Custom AI/ML Engine (`feature_extractor`, `anomaly_detector`, `explainer`)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Linux environment (required for real-time `ps` and `ss` system monitoring commands)
- Firebase Project (with Authentication and Firestore enabled)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cybersoc.git
   cd cybersoc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase Configuration**
   - Create a `firebase-applet-config.json` file in the root directory with your Firebase project configuration:
   ```json
   {
     "projectId": "your-project-id",
     "appId": "your-app-id",
     "apiKey": "your-api-key",
     "authDomain": "your-auth-domain",
     "firestoreDatabaseId": "(default)"
   }
   ```
   - Make sure to set up Firestore Security Rules using the provided `firestore.rules` file.

4. **Set up environment variables**
   Copy the example environment file and configure your secrets:
   ```bash
   cp .env.example .env
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

### Production Build

To build and run the application in a production environment:

```bash
npm run build
npm start
```

## 📂 Project Structure

```text
/
├── server.ts                 # Express backend entry point & Vite middleware
├── firebase-applet-config.json # Firebase configuration
├── firestore.rules           # Firestore security rules
├── src/
│   ├── ai/                   # AI/ML logic (Anomaly detection, feature extraction)
│   ├── api/                  # Frontend API client (Axios)
│   ├── backend/              # Backend logic
│   │   ├── routes/           # Express API routes (auth, logs, system, alerts)
│   │   ├── services/         # Business logic (log processing, system monitoring)
│   │   ├── middleware/       # Auth middleware (Firebase Admin token verification)
│   │   ├── firebaseAdmin.ts  # Firebase Admin SDK initialization
│   │   └── database.ts       # SQLite database initialization
│   ├── components/           # React UI components (Dashboard, Panels, Charts)
│   ├── firebase.ts           # Firebase client initialization
│   └── hooks/                # Custom React hooks (e.g., usePolling)
├── agent/                    # Python-based external agents (optional)
└── package.json              # Project dependencies and scripts
```

## 🧠 How the AI Works

1. **Feature Extraction:** Incoming logs and system data are parsed to extract key numerical and categorical features (e.g., bytes transferred, time of day, failure rates).
2. **Anomaly Prediction:** The features are fed into the `anomalyDetector`, which calculates a risk score.
3. **Explanation & Mitigation:** If a log is flagged as an anomaly (score > threshold), the `explainer` module generates a human-readable reason and suggests immediate mitigation steps.
4. **Alert Generation:** A critical or medium alert is dispatched to the dashboard for SOC analysts to review.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/cybersoc/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
