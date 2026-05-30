# 🏥 Mom-Care — AI-Powered Medical Assistant

> 📐 **Architecture Diagrams**: [How Coral + Gemini work together](./docs/coral-gemini-architecture.md)

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-orange)](https://ai.google.dev)
[![Coral](https://img.shields.io/badge/Coral-0.4.1-teal)](https://withcoral.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://mongodb.com)

**Upload real prescription images → Gemini extracts data → Chat with your medical bot → Generate doctor visit packets via Coral SQL**

</div>

---

## 🌊 Architecture

```mermaid
flowchart TD
    subgraph Client["🖥️ Client (Browser)"]
        UI["index.html\nUpload + Chat UI"]
    end

    subgraph Server["⚙️ Node.js Server (Express + Socket.IO)"]
        API_DOC["POST /api/documents/extract"]
        API_CORAL["GET  /api/coral/status\nPOST /api/coral/packet/:id\nGET  /api/coral/analytics"]
        SOCKET["Socket.IO\nReal-time Chat"]
    end

    subgraph AI["🤖 Gemini AI Layer"]
        VISION["Gemini Vision\n(multimodal OCR)"]
        BOT["Medical Bot Agent\n(function calling)"]
    end

    subgraph Storage["💾 Storage"]
        MONGO["MongoDB Atlas\n(MedicalRecord)"]
        JSONL["JSONL Files\n(data/*.jsonl)"]
    end

    subgraph CoralLayer["🪸 Coral SQL Layer (v0.4.1)"]
        CLI["coral sql --format json"]
        S1["momcare_patients"]
        S2["momcare_prescriptions"]
        S3["momcare_conditions"]
        S4["momcare_appointments"]
        S5["momcare_insurance"]
    end

    UI -->|"Upload prescription PDF/image"| API_DOC
    API_DOC --> VISION
    VISION -->|"Extracts structured JSON"| MONGO
    VISION -->|"Writes real AI data"| JSONL
    JSONL --> S1 & S2 & S3 & S4 & S5
    S1 & S2 & S3 & S4 & S5 --> CLI
    CLI --> API_CORAL

    UI <-->|"WebSocket"| SOCKET
    SOCKET --> BOT
    BOT -->|"Tool calls"| MONGO

    style AI fill:#fff3e0,stroke:#f57c00
    style CoralLayer fill:#e8f5e9,stroke:#388e3c
    style Storage fill:#e3f2fd,stroke:#1976d2
```

---

## 📋 Prerequisites

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 18+ | https://nodejs.org |
| **Coral CLI** | 0.4.1+ | See below |
| **MongoDB Atlas** | Free account | https://mongodb.com/atlas |
| **Gemini API Key** | Free | https://aistudio.google.com |

---

## 🪸 Install Coral CLI

### Windows (PowerShell)
```powershell
# Download
Invoke-WebRequest -Uri "https://github.com/withcoral/coral/releases/latest/download/coral-x86_64-pc-windows-msvc.zip" -OutFile "coral.zip"
Expand-Archive -Path "coral.zip" -DestinationPath "coral-bin" -Force

# Install to user folder
$dest = "$env:USERPROFILE\AppData\Local\Programs\coral"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item "coral-bin\coral.exe" -Destination "$dest\coral.exe"

# Add to PATH
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", "$path;$dest", "User")

# Open new terminal and verify
coral --version
```

### macOS / Linux
```bash
brew install withcoral/tap/coral
# OR
curl -fsSL https://withcoral.com/install.sh | sh
coral --version
```

---

## 🚀 Setup

### 1. Clone & install
```bash
git clone https://github.com/rahulkbharti/momscare.git
cd momscare
npm install
```

### 2. Setup MongoDB Atlas
1. Go to https://cloud.mongodb.com → Create free cluster
2. **Database Access** → Add user (username + password)
3. **Network Access** → Add `0.0.0.0/0`
4. **Connect** → Copy connection string

### 3. Create `.env`
```bash
cp .env.example .env
```

Fill in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
DOCUMENT_API_TOKEN=any-secret-token
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/momcare
```

### 4. Run setup script ⭐
```bash
npm run setup
```

This automatically:
- **Downloads & installs Coral CLI** if not already installed (Windows ZIP / Mac-Linux install.sh)
- Creates `data/` directory
- Updates all 5 Coral manifest paths for **your** machine
- Updates `CORAL_DATA_PATH` in your `.env`
- Detects & saves Coral CLI path

### 5. Start
```bash
npm run dev
```

Expected output:
```
MongoDB connected.
[Coral] CLI found: coral 0.4.1+...
[Coral] ✓ Registered source: momcare_patients
[Coral] ✓ Registered source: momcare_prescriptions
[Coral] ✓ Registered source: momcare_conditions
[Coral] ✓ Registered source: momcare_appointments
[Coral] ✓ Registered source: momcare_insurance
Server is running on port 8000
```

### 6. Open
```
http://localhost:8000
```


---

## 🧪 API Reference

```bash
# Health check
GET  /health

# Coral status
GET  /api/coral/status

# Upload & extract prescription
POST /api/documents/extract
  Header: Authorization: Bearer <DOCUMENT_API_TOKEN>
  Body:   multipart/form-data, field: files

# Get record
GET  /api/documents/:id

# Generate doctor visit packet (Coral + Gemini AI)
POST /api/coral/packet/:id
  Body: { "visitPurpose": "diabetes follow-up" }

# Cross-patient analytics
GET  /api/coral/analytics

# Run custom Coral SQL
POST /api/coral/query
  Body: { "sql": "SELECT * FROM momcare_patients.patients" }
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model name |
| `DOCUMENT_API_TOKEN` | ✅ | — | Bearer token for upload endpoints |
| `MONGODB_URI` | ✅ | — | MongoDB Atlas connection string |
| `CORAL_CLI_PATH` | No | `coral` | Full path to coral binary |
| `CORAL_DATA_PATH` | ✅ | `./data` | **Absolute** path to data directory |
| `PORT` | No | `8000` | Server port |

---

## 📁 Project Structure

```
mom-care-api/
├── src/
│   ├── server.ts              # Entry point + Coral auto-registration
│   ├── socket.ts              # Socket.IO real-time chat
│   ├── agents/
│   │   ├── gemini.client.ts   # Gemini AI client
│   │   └── medicalbot.agent.ts
│   ├── routes/
│   │   ├── document.routes.ts # Upload/extract endpoints
│   │   └── coral.routes.ts    # Coral SQL endpoints
│   ├── lib/
│   │   ├── coral.client.ts    # Coral CLI wrapper
│   │   └── coral.queries.ts   # SQL query builders
│   └── utils/
│       ├── extract.utils.ts   # Gemini Vision extraction
│       └── coral.writer.ts    # Writes data to JSONL
├── coral/sources/             # 5 Coral source manifests
├── data/                      # JSONL files (auto-created)
├── public/index.html          # Frontend UI
└── .env.example
```

---

## ⚠️ Safety Disclaimer

Mom-Care does **NOT** diagnose, prescribe, or recommend medicine changes.
It only organizes records and generates questions to ask a licensed medical professional.
