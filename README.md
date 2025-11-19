# ArogyaNet Frontend

A modern, responsive healthcare platform frontend built with React, TypeScript, Vite, and shadcn/ui. This application provides a complete telemedicine solution with patient dashboards, doctor portals, video consultations, appointment management, and health assessments.

## 🚀 Features

- **🔐 Authentication System**: Secure login/registration with JWT tokens
- **👨‍⚕️ Doctor Dashboard**: 
  - Manage appointments
  - View patient records
  - Create prescriptions
  - Access shared documents
  - Video consultations
- **🏥 Patient Dashboard**:
  - Book appointments
  - View medical history
  - Upload health documents
  - Health risk assessments
  - Video consultations
- **📹 Video Calling**: WebRTC-powered real-time video consultations
- **📄 Document Management**: Secure upload, storage, and sharing of medical documents
- **� Automatic Encryption**: Client-side ChaCha20-Poly1305 encryption for all documents
  - Keys automatically derived from user accounts
  - No manual key management required
  - Doctors can transparently access patient documents
- **�💊 Prescription System**: Digital prescription creation and viewing
- **📊 Health Assessments**: ML-powered liver disease risk assessment
- **🔔 Real-time Notifications**: Socket.IO integration for instant updates
- **🎨 Modern UI**: Beautiful, accessible components with shadcn/ui
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **♿ Accessibility**: WCAG compliant components
- **🌙 Professional Theme**: Clean medical interface with Lovable theme

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager
- Running ArogyaNet Backend server
- Modern web browser with WebRTC support

## 🛠️ Installation

1. **Navigate to the project directory**
   ```bash
   cd stream-to-web-studio
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Backend API URL
   VITE_BACKEND_URL=http://localhost:8090

   # Socket.IO Server URL (usually same as backend)
   VITE_SOCKET_URL=http://localhost:8090

   # Encryption Salt (IMPORTANT: Change in production!)
   # Used for automatic document encryption key derivation
   # Keep this secret and consistent - changing it makes old documents unreadable
   VITE_ENCRYPTION_SALT=your_unique_secret_salt_here

   # WebRTC Configuration (optional - will use backend defaults if not set)
   VITE_TURN_API_URL=
   VITE_ICE_RELAY_ONLY=false

   # ML Service URL
   VITE_ML_SERVICE_URL=http://localhost:5000
   ```

   See `.env.example` for more details and `ENCRYPTION_SALT_CONFIG.md` for security recommendations.

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
# or
bun dev
```
The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
# or
bun run build
```

### Preview Production Build
```bash
npm run preview
# or
bun preview
```

### Lint Code
```bash
npm run lint
# or
bun lint
```

## 📁 Project Structure

```
stream-to-web-studio/
├── public/
│   └── robots.txt
├── src/
│   ├── api/
│   │   └── client.ts          # Axios API client configuration
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── AboutSection.tsx
│   │   ├── AppointmentSection.tsx
│   │   ├── DocumentUploadSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── HealthScoreSection.tsx
│   │   ├── HeroSection.tsx
│   │   ├── IncomingCallNotification.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── VideoCall.tsx
│   │   ├── AppErrorBoundary.tsx
│   │   └── ...
│   ├── config/
│   │   └── api.ts            # API configuration
│   ├── contexts/
│   │   └── *.tsx             # React contexts
│   ├── hooks/
│   │   ├── useAuth.tsx       # Authentication hook
│   │   ├── useSocket.tsx     # Socket.IO hook
│   │   └── ...
│   ├── lib/
│   │   └── utils.ts          # Utility functions
│   ├── pages/
│   │   ├── Index.tsx         # Landing page
│   │   ├── Auth.tsx          # Login/Register
│   │   ├── DoctorDashboard.tsx
│   │   ├── PatientDashboard.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── BookAppointment.tsx
│   │   ├── VideoCallPage.tsx
│   │   └── NotFound.tsx
│   ├── services/
│   │   └── *.ts              # API service modules
│   ├── App.tsx               # Main app component
│   ├── App.css
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── components.json           # shadcn/ui configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── package.json
```

## 🎯 Key Pages

### Landing Page (`/`)
- Hero section with call-to-action
- Features showcase
- About section
- Registration prompts

### Authentication (`/auth`)
- Login form
- Registration form
- Role selection (Patient/Doctor)
- Forgot password

### Patient Dashboard (`/patient-dashboard`)
- Upcoming appointments
- Quick appointment booking
- Document upload
- Health assessments
- Medical history
- Profile management

### Doctor Dashboard (`/doctor-dashboard`)
- Appointment queue
- Patient records
- Prescription creation
- Shared documents
- Statistics

### Admin Panel (`/admin-panel`)
- User management
- System statistics
- Doctor approvals
- Platform monitoring

### Video Call Page (`/video-call/:roomId`)
- Real-time video streaming
- Audio/video controls
- Screen sharing
- Chat (if implemented)
- Call controls

### Book Appointment (`/book-appointment`)
- Doctor selection
- Time slot picker
- Appointment details
- Confirmation

## 🔌 API Integration

The app communicates with the backend through REST APIs and WebSockets:

### REST API
```typescript
// Example API call using the client
import api from '@/api/client';

const appointments = await api.get('/api/appointments');
```

### WebSocket (Socket.IO)
```typescript
// Example socket usage
import { useSocket } from '@/hooks/useSocket';

const { socket, isConnected } = useSocket();

socket?.on('appointment-update', (data) => {
  // Handle real-time update
});
```

## 🎨 UI Components

Built with **shadcn/ui** - a collection of re-usable components built with Radix UI and Tailwind CSS:

- **Forms**: Input, Select, Checkbox, Radio, Switch
- **Data Display**: Table, Card, Avatar, Badge
- **Feedback**: Toast, Alert, Dialog, Progress
- **Navigation**: Tabs, Dropdown Menu, Navigation Menu
- **Overlays**: Dialog, Popover, Tooltip, Sheet

## 🔐 Authentication Flow

1. User logs in via `/auth`
2. Backend returns access and refresh tokens
3. Tokens stored in localStorage
4. API client automatically includes token in requests
5. Protected routes check authentication status
6. Socket connection identifies user
7. Refresh token used to renew expired access tokens

## 📹 WebRTC Video Calling

### Flow
1. Doctor/Patient initiates call from dashboard
2. WebRTC offer created and sent via Socket.IO
3. Recipient receives incoming call notification
4. On accept, answer sent back
5. ICE candidates exchanged
6. Peer-to-peer connection established
7. Video/audio streams rendered

### Features
- Real-time video and audio
- Camera toggle
- Microphone toggle
- End call
- Automatic ICE server configuration from backend

## 🏥 Health Assessment

Liver disease risk assessment using ML model:
1. Patient fills questionnaire
2. Data sent to ML service via backend
3. Results displayed with risk score
4. Recommendations provided
5. History saved for future reference

## 📱 Responsive Design

Breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

All components adapt to screen size with mobile-first approach.

## 🎨 Theming

The app uses Tailwind CSS with custom theme configuration:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      // Custom medical theme colors
    }
  }
}
```

## 🔧 Configuration Files

### `vite.config.ts`
- Development server settings
- Build optimization
- Plugin configuration

### `tsconfig.json`
- TypeScript compiler options
- Path aliases
- Module resolution

### `components.json`
- shadcn/ui configuration
- Component installation settings

## 🚀 Deployment

### AWS S3 + CloudFront (Static Hosting)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Upload to S3**
   ```powershell
   # Using the provided PowerShell script
   .\updates3bucket.ps1
   ```

3. **Configure CloudFront**
   - Point to S3 bucket
   - Enable HTTPS
   - Set up custom domain

4. **Update environment variables**
   - Set production API URLs
   - Configure CORS on backend

### Other Hosting Options

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **Nginx**: Serve `dist/` folder
- **Apache**: Serve `dist/` folder with SPA config

### SPA Routing Configuration

For client-side routing to work on production:

**Nginx** (`nginx.conf`):
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache** (`.htaccess`):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**S3**: Set error document to `index.html`

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration (patient/doctor)
- [ ] Login/logout
- [ ] Book appointment
- [ ] Video call initiation
- [ ] Document upload
- [ ] Health assessment
- [ ] Prescription viewing
- [ ] Real-time notifications
- [ ] Responsive on mobile
- [ ] Cross-browser compatibility

### Browser Support
- Chrome/Edge (Chromium) - Full support
- Firefox - Full support
- Safari - Full support (iOS 11+)
- Opera - Full support

## 🐛 Troubleshooting

### WebRTC Not Working
- Check browser permissions (camera/microphone)
- Verify TURN server configuration
- Check firewall/network restrictions
- Test on different network

### Socket Connection Failed
- Verify backend is running
- Check CORS configuration
- Verify Socket.IO URL in `.env`
- Check network/firewall

### API Errors
- Verify backend is running
- Check API URL in `.env`
- Verify authentication token
- Check browser console for errors

### Build Errors
- Clear `node_modules` and reinstall
- Check Node.js version
- Verify all environment variables
- Check TypeScript errors

## 📦 Dependencies

### Core
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and caching

### UI
- **shadcn/ui**: Component library
- **Radix UI**: Accessible primitives
- **Tailwind CSS**: Utility-first CSS
- **Lucide React**: Icons
- **Framer Motion**: Animations

### Communication
- **Axios**: HTTP client
- **Socket.IO Client**: Real-time communication

### Forms
- **React Hook Form**: Form management
- **Zod**: Schema validation

### Utilities
- **date-fns**: Date manipulation
- **clsx**: Conditional classes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript and ESLint rules
4. Test on multiple browsers
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

ArogyaNet Development Team

## 📞 Support

For issues and questions:
- Open an issue in the repository
- Contact the development team
- Check documentation files in the repo

---

**Original Lovable Project**: [https://lovable.dev/projects/7f3767b8-4b06-4ef1-b6e2-a3578db7066b](https://lovable.dev/projects/7f3767b8-4b06-4ef1-b6e2-a3578db7066b)

**Note**: This is a healthcare application. Ensure compliance with HIPAA, GDPR, and relevant healthcare data protection regulations. Always use HTTPS in production and handle patient data with appropriate security measures.
