# Survey Generator Frontend

A modern, fully-interactive Next.js 14 SPA for creating AI-powered surveys with live editing, real-time progress streaming, and multi-format export.

**Built with:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · SurveyJS Creator · Framer Motion

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- FastAPI backend running on `http://localhost:8000`
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Configuration

Create `.env.local` from the example:
```bash
cp .env.local.example .env.local
```

Update with your settings:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Features

### 🎯 4-Step Wizard

#### **Step 1: Project Details**
- Input company name, project name, industry, use case
- Automatic business overview generation via AI
- Form validation with error handling

#### **Step 2: Research Objectives**
- Review AI-generated business overview
- Edit research objectives
- Editable text areas for refinement
- Ready for survey generation

#### **Step 3: Generate Survey**
- Real-time WebSocket progress streaming
- Animated step indicators (Drafting → Variants → Choices → DOCX)
- Fallback polling if WebSocket disconnects
- Live progress log with timestamps

#### **Step 4: Survey Builder**
- **SurveyJS Creator** integration for drag-and-drop editing
- Full question editing capabilities (order, text, choices)
- Preview mode in modal dialog
- Multi-format export support

### 📊 Export Formats

1. **DOCX** - Word document with formatted questions
2. **Qualtrics JSON** - Import directly into Qualtrics
3. **Typeform CSV** - CSV format for Typeform import

All exports maintain question structure, choices, and metadata.

---

## 🔧 Architecture

### State Management
- **Zustand store** (`lib/store.ts`): Wizard state persisted in sessionStorage
- Preserves form data across navigation
- Auto-restores on page reload

### API Integration
- **JWT Bearer tokens**: Automatic login on first API call
- Token persisted in localStorage
- Automatic re-authentication on 401 errors
- Typed API client with full error handling

### Components
- **Dynamic imports** for SurveyJS Creator (no SSR)
- **Framer Motion** animations for smooth transitions
- **Glass-morphism design** with dark theme
- **Responsive** layout (mobile, tablet, desktop)

### Styling
- Tailwind CSS with custom configuration
- Dark mode with gradient backgrounds
- CSS variable system for theming
- Floating background orbs animation

---

## 🔐 Authentication

Automatic JWT authentication flow:

1. First API call → Checks localStorage for token
2. If missing → Calls `/api/v1/auth/login` (public endpoint)
3. Token stored in localStorage
4. Included in `Authorization: Bearer <token>` header
5. Auto-refresh on 401 error

No manual login form needed - happens silently in the background.

---

## 🌐 Backend API Integration

### Endpoints Used
- `POST /api/v1/auth/login` - Get JWT token
- `POST /api/v1/surveys/business-overview` - AI business overview
- `POST /api/v1/surveys/research-objectives` - AI research objectives  
- `POST /api/v1/surveys/generate` - Start survey generation
- `GET /api/v1/surveys/status/{request_id}` - Poll generation status
- `WS /ws/survey/{request_id}` - WebSocket live progress

### CORS
Frontend must be added to backend CORS allowed origins (already configured for localhost:3000).

---

## 📦 Dependencies

### Core
- `next@^16.2.1` - React framework
- `react@^19.2.4` - UI library
- `typescript@^5` - Type safety

### Survey Building
- `survey-core@^2.5.17` - SurveyJS core
- `survey-creator-react@^2.5.17` - Drag-and-drop editor
- `survey-react-ui@^2.5.17` - Survey renderer

### Styling & Animation
- `tailwindcss@^4` - Utility CSS
- `framer-motion@^12.38.0` - Animations
- `lucide-react@^1.7.0` - Icons

### State & HTTP
- `zustand@^5.0.12` - State management
- Axios via native `fetch` API

### Export
- `docx@^8.5.0` - DOCX generation
- `html2pdf.js@^0.10.1` - PDF (optional)

---

## 🛠️ Development

### Type Checking
```bash
npm run type-check
```

### Build
```bash
npm run build
```

### Production Server
```bash
npm run start
```

---

## 📝 File Structure

```
frontend/
├── app/
│   ├── globals.css              # Dark theme & animations
│   ├── layout.tsx               # Root layout with floating orbs
│   ├── page.tsx                 # Step 1: Project Details
│   ├── research/page.tsx        # Step 2: Research Objectives
│   ├── generate/page.tsx        # Step 3: Generate Survey
│   └── builder/page.tsx         # Step 4: Survey Builder
├── components/
│   ├── WizardLayout.tsx         # Main wrapper
│   ├── StepIndicator.tsx        # Step progress indicator
│   ├── ProgressStream.tsx       # Real-time log
│   ├── SurveyCreator.tsx        # SurveyJS Creator wrapper
│   ├── SurveyPreview.tsx        # Preview dialog
│   └── ExportMenu.tsx           # Export options dialog
├── lib/
│   ├── api.ts                   # API client with types
│   ├── store.ts                 # Zustand state
│   ├── utils.ts                 # JWT auth helpers
│   └── exportUtils.ts           # Export format converters
├── public/                       # Static assets
├── .env.local                   # Local environment
├── tailwind.config.ts           # CSS config
├── postcss.config.mjs           # PostCSS config
└── package.json                 # Dependencies
```

---

## 🎨 Design System

### Colors
- **Primary**: Indigo/Violet gradients
- **Background**: Dark slate (#0a0a1a)
- **Glass**: Translucent white on dark
- **Accent**: Emerald, Rose, Sky

### Typography
- **Body**: Inter (300-900)
- **Headings**: Outfit (400-800)
- **Monospace**: Default for code

### Animations
- smooth page transitions (200-400ms)
- Floating background orbs
- Pulse dots on progress
- Scale on hover/click

---

## 🐛 Troubleshooting

### API Connection Failed
- Ensure FastAPI backend is running on `http://localhost:8000`
- Check CORS configuration in backend
- Verify JWT token is being sent in headers

### SurveyJS Creator Not Loading
- Check browser console for import errors
- Ensure `survey-creator-react` is installed
- Try clearing `.next` cache and rebuilding

### Export Not Working
- Check browser console for errors
- Ensure blob download is allowed by browser
- Try different browser if issues persist

### WebSocket Connection Fails
- Falls back to polling automatically
- Check backend WebSocket handler
- Verify firewall allows WebSocket upgrades

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [SurveyJS Creator Docs](https://surveyjs.io/survey-creator/documentation/overview)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📄 License

MIT (Matches backend FastAPI project)

---

**Ready to generate surveys?** 🚀

1. Start backend: `uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Open http://localhost:3000
4. Create your first survey!
