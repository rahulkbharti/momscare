# 🪸 How Coral + Gemini Work Together in Mom-Care

---

## 1. Complete System Flow

```mermaid
flowchart LR
    subgraph INPUT["📥 Input"]
        IMG["Prescription\nImage / PDF"]
        USER_Q["User Question\n(chat)"]
    end

    subgraph GEMINI_VISION["🤖 Gemini Vision AI"]
        OCR["OCR + Extraction\ngemini-2.5-flash-lite"]
        SCHEMA["Structured JSON\npatient, medicines,\nconditions, appointments"]
    end

    subgraph STORAGE["💾 Dual Write"]
        MONGO[("MongoDB Atlas\nMedicalRecord")]
        JSONL["📄 JSONL Files\ndata/patients.jsonl\ndata/prescriptions.jsonl\ndata/conditions.jsonl\ndata/appointments.jsonl\ndata/insurance.jsonl"]
    end

    subgraph CORAL["🪸 Coral SQL Engine"]
        SRC1["momcare_patients"]
        SRC2["momcare_prescriptions"]
        SRC3["momcare_conditions"]
        SRC4["momcare_appointments"]
        SRC5["momcare_insurance"]
        SQL["SQL JOIN\nquery engine"]
    end

    subgraph GEMINI_BOT["🤖 Gemini Chat Bot"]
        BOT["Medical Bot Agent\nFunction Calling"]
        FN["Tool: get_prescriptions\nTool: get_conditions\nTool: get_appointments"]
        REPLY["Personalized\nAI Response"]
    end

    subgraph OUTPUT["📤 Output"]
        PACKET["Doctor Visit\nPacket"]
        CHAT_OUT["Chat Reply\n(real-time)"]
        ANALYTICS["Analytics\nDashboard"]
    end

    IMG --> OCR --> SCHEMA
    SCHEMA --> MONGO
    SCHEMA --> JSONL

    JSONL --> SRC1 & SRC2 & SRC3 & SRC4 & SRC5
    SRC1 & SRC2 & SRC3 & SRC4 & SRC5 --> SQL

    SQL -->|"JOIN result"| GEMINI_BOT
    GEMINI_BOT --> PACKET

    USER_Q --> BOT
    BOT --> FN
    FN -->|"queries"| MONGO
    MONGO -->|"patient data"| BOT
    BOT --> REPLY --> CHAT_OUT

    SQL --> ANALYTICS

    style GEMINI_VISION fill:#fff3e0,stroke:#f57c00,color:#000
    style GEMINI_BOT fill:#e8f5e9,stroke:#388e3c,color:#000
    style CORAL fill:#e3f2fd,stroke:#1976d2,color:#000
    style STORAGE fill:#f3e5f5,stroke:#7b1fa2,color:#000
```

---

## 2. Prescription Upload → Coral Data Pipeline

```mermaid
sequenceDiagram
    actor User
    participant API as Express API<br/>/api/documents/extract
    participant GV as Gemini Vision<br/>(gemini-2.5-flash-lite)
    participant DB as MongoDB Atlas
    participant CW as coral.writer.ts
    participant JL as JSONL Files<br/>(data/*.jsonl)
    participant CR as Coral CLI<br/>(coral sql)

    User->>API: POST /api/documents/extract<br/>+ prescription image

    API->>GV: Send image for OCR
    Note over GV: Reads handwritten/printed<br/>prescription with schema

    GV-->>API: Structured JSON<br/>{ patient, doctor, conditions,<br/>prescriptions, appointments }

    API->>DB: MedicalRecord.create(data)
    DB-->>API: Saved _id

    API->>CW: writeToCoralJsonl(id, data)

    Note over CW: Splits data into 5 files

    CW->>JL: patients.jsonl ← patient row
    CW->>JL: prescriptions.jsonl ← N medicine rows
    CW->>JL: conditions.jsonl ← N condition rows
    CW->>JL: appointments.jsonl ← N appointment rows
    CW->>JL: insurance.jsonl ← N insurance rows

    API-->>User: 201 { _id, patient, prescriptions... }

    Note over JL,CR: Now Coral can query this REAL data!
    CR->>JL: SELECT * FROM momcare_patients.patients
    JL-->>CR: [ { record_id, name, age, doctor_name } ]
```

---

## 3. Gemini Chatbot — How It Answers Questions

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend<br/>(Socket.IO)
    participant BOT as Medical Bot Agent<br/>(Gemini + Function Calling)
    participant TOOLS as Tool Functions
    participant DB as MongoDB Atlas

    User->>FE: "What medicines is Rahul taking?"
    FE->>BOT: socket.emit("message", { text, recordId })

    BOT->>BOT: Gemini decides which tool to call

    BOT->>TOOLS: call get_prescriptions(recordId)
    TOOLS->>DB: MedicalRecord.findById(id)
    DB-->>TOOLS: { prescriptions: [Metformin, Amlodipine...] }
    TOOLS-->>BOT: prescription data

    BOT->>BOT: Gemini generates answer<br/>using tool result

    BOT-->>FE: "Rahul is currently on:<br/>• Metformin 500mg — twice daily (after meals)<br/>• Amlodipine 5mg — once daily (morning)<br/>• Atorvastatin 10mg — once daily (at night)"

    FE-->>User: Display AI response (real-time)

    Note over User,DB: Different from Coral:<br/>Chatbot uses MongoDB (conversational)<br/>Coral used for SQL analytics + JOIN queries
```

---

## 4. Doctor Visit Packet — Coral + Gemini Together

```mermaid
sequenceDiagram
    actor User
    participant API as POST /api/coral/packet/:id
    participant CR as Coral CLI
    participant JL as JSONL Files
    participant GA as Gemini AI

    User->>API: POST /api/coral/packet/6a1ac...
    Note over API: visitPurpose: "diabetes follow-up"

    API->>CR: coral sql (JOIN query across 4 sources)
    CR->>JL: Query patients + prescriptions<br/>+ conditions + appointments
    JL-->>CR: 1 row with all patient data joined

    CR-->>API: { name, age, medicines, conditions,<br/>appointments, doctor }

    Note over API: Passes Coral result to Gemini

    API->>GA: "Generate doctor visit packet for this patient:<br/>{ Rahul Sharma, 35, Hypertension + Diabetes,<br/>Metformin + Amlodipine + Atorvastatin... }"

    GA-->>API: Personalized packet:<br/>1. Patient Summary<br/>2. Current Medications<br/>3. Medical Conditions<br/>4. Upcoming Appointments<br/>5. PERSONALIZED Questions to Ask Dr. Mehta<br/>6. Safety Note

    API-->>User: { packet: "...", coralRows: 1, durationMs: 115ms }
```

---

## 5. Key Difference: Coral vs Chatbot

```mermaid
flowchart TD
    subgraph CORAL_WAY["🪸 Coral SQL Path"]
        C1["User requests\ndoctor packet / analytics"]
        C2["Coral SQL JOIN\nacross 5 JSONL sources"]
        C3["Structured tabular result"]
        C4["Gemini generates\nPERSONALIZED packet"]
        C1 --> C2 --> C3 --> C4
    end

    subgraph CHAT_WAY["💬 Gemini Chatbot Path"]
        G1["User asks a\nconversational question"]
        G2["Gemini decides\nwhich tool to call"]
        G3["Tool queries\nMongoDB directly"]
        G4["Gemini replies\nin natural language"]
        G1 --> G2 --> G3 --> G4
    end

    subgraph USE_CASES["📌 When to Use Which"]
        UC1["✅ Coral: Analytics, JOINs,\ncross-patient reports,\ndoctor packets"]
        UC2["✅ Chatbot: Real-time chat,\nconversational Q&A,\nspecific patient questions"]
    end

    CORAL_WAY --> UC1
    CHAT_WAY --> UC2

    style CORAL_WAY fill:#e3f2fd,stroke:#1976d2,color:#000
    style CHAT_WAY fill:#e8f5e9,stroke:#388e3c,color:#000
    style USE_CASES fill:#fff9c4,stroke:#f9a825,color:#000
```

---

## API Quick Reference

| Endpoint | Method | What it uses | Output |
|---|---|---|---|
| `/api/documents/extract` | POST | Gemini Vision | Extracted patient data |
| `/api/coral/status` | GET | Coral CLI | Registered sources |
| `/api/coral/query` | POST | Coral SQL | Raw SQL results |
| `/api/coral/analytics` | GET | Coral SQL | Top conditions + medicines |
| `/api/coral/packet/:id` | POST | Coral SQL + Gemini AI | Doctor visit packet |
| `/api/dashboard/stats` | GET | MongoDB | Record counts |
| `/api/dashboard/system` | GET | MongoDB + Coral + Gemini | Health status |
