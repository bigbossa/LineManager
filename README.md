# LINE OA Smart Broadcaster

ระบบส่งข้อความ LINE Official Account พร้อม AI Personalization

![LINE Smart Broadcaster](https://img.shields.io/badge/LINE-Messaging%20API-06C755?style=flat&logo=line)
![Gemini AI](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat&logo=google)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)

## ✨ Features

- **📢 Broadcast Messages** - ส่งข้อความถึง followers ทั้งหมดได้ทันที
- **🤖 AI Personalization** - ใช้ Google Gemini AI สร้างข้อความเฉพาะบุคคล
- **👥 Contact Management** - จัดการรายชื่อ contacts
- **📱 Live Preview** - ดูตัวอย่างข้อความบน LINE UI
- **⚙️ Easy Configuration** - ตั้งค่า LINE API ง่ายๆ ผ่าน UI

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment

สร้างไฟล์ `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. รัน Development Server

```bash
npm run dev
```

เปิด http://localhost:4444

## ⚙️ Configuration

### LINE Messaging API Setup

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider และ Messaging API Channel
3. คัดลอก **Channel ID** และ **Channel Access Token**
4. ในแอป ไปที่ **Settings** → **LINE Messaging API** → **Configure**
5. ใส่ Channel ID และ Token → **Save**

### Google Gemini AI Setup

1. ไปที่ [Google AI Studio](https://aistudio.google.com/)
2. สร้าง API Key
3. ใส่ใน `.env.local` หรือเลือกผ่าน UI

## 📖 Usage

### Broadcast Message (ส่งถึงทุกคน)

1. ไปที่ **Broadcasts**
2. พิมพ์ข้อความใน Base Message
3. กด **📢 Broadcast to ALL Followers**
4. ยืนยัน → ส่งเสร็จ!

### AI Personalized Message

1. ไปที่ **Broadcasts**
2. พิมพ์ข้อความพื้นฐาน
3. กด **✨ Generate with AI** 
4. AI จะสร้างข้อความเฉพาะสำหรับแต่ละคน
5. กด **Send Personalized** เพื่อส่ง

## 🔒 LINE API Permissions

| Feature | Unverified Account | Verified Account |
|---------|-------------------|------------------|
| Broadcast Message | ✅ | ✅ |
| Push Message | ✅ | ✅ |
| Get Bot Info | ✅ | ✅ |
| Get Followers | ❌ | ✅ |

> **Note:** Get Followers API ต้องการ Verified Account เท่านั้น

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS
- **Build:** Vite
- **AI:** Google Gemini API
- **Messaging:** LINE Messaging API

## 📁 Project Structure

```
line-oa-smart-broadcaster/
├── App.tsx                 # Main application
├── types.ts                # TypeScript types
├── constants.ts            # Mock data & constants
├── components/
│   ├── ApiKeyModal.tsx     # Gemini API key modal
│   ├── LineConfigModal.tsx # LINE API config modal
│   └── PhonePreview.tsx    # LINE message preview
├── services/
│   ├── geminiService.ts    # Gemini AI service
│   └── lineService.ts      # LINE Messaging API service
└── vite.config.ts          # Vite config with LINE proxy
```

## 🔧 Development

### Proxy Configuration

LINE API ถูก proxy ผ่าน Vite dev server เพื่อหลีกเลี่ยง CORS:

```typescript
// vite.config.ts
proxy: {
  '/line-api': {
    target: 'https://api.line.me',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/line-api/, ''),
  },
}
```

### Build for Production

```bash
npm run build
```

> สำหรับ production ต้องใช้ backend server สำหรับ LINE API calls

## 📝 License

MIT

## 🙏 Credits

- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [Google Gemini API](https://ai.google.dev/)
- [Lucide Icons](https://lucide.dev/)
