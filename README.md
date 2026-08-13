## Hotel Revenue Optimizer

A dynamic pricing platform for hotels that optimizes room rates in real-time based on occupancy, demand, and seasonality.

## Features

- **Dynamic Pricing Engine** - Calculates optimal room prices based on 5 factors:
  - Occupancy rate
  - Days until booking
  - Weekends & holidays
  - Seasonal demand
  - Booking velocity

- **Real-time Dashboard** - WebSocket-powered live occupancy tracking for hotel staff
- **Booking Management** - Guest booking system with room availability tracking
- **AI-Powered Recommendations** - Natural language processing for guest queries
- **Role-based Authentication** - Secure JWT-based access control

## Tech Stack

**Frontend:**
- React 18 with Vite
- Recharts for data visualization
- Socket.io-client for real-time updates

**Backend:**
- Node.js + Express
- PostgreSQL database
- Socket.io for WebSocket communication
- groq for AI features
- JWT for authentication

## Quick Start

### Prerequisites
- Node.js v16+
- PostgreSQL
- OpenAI API key (optional, for AI features)

### Setup

**1. Clone the repository**
```bash
git clone <repo-url>
cd hotel-revenue-optimizer
```

**2. Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Add your database credentials and API keys to .env
npm run dev
```

**3. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## How It Works

### Pricing Algorithm

```
Final Price = Base Price × 
              (Occupancy Multiplier) × 
              (Timing Multiplier) × 
              (Velocity Multiplier) × 
              (Seasonality Multiplier)
```

**Example:**
- Base: ₹5,000
- High occupancy (90%+): 1.40x
- Last-minute (2 days): 1.25x
- Weekend: 1.15x
- Peak season: 1.15x
- **Final: ₹11,656** (clamped between 70-200% of base)

### Database Schema

- **hotels** - Hotel information and base pricing
- **rooms** - Room types and capacity
- **bookings** - Guest bookings
- **pricing_history** - Audit trail of all price calculations
- **staff** - Hotel staff authentication

## API Endpoints

### Authentication
- `POST /api/auth/login` - Staff login
- `POST /api/auth/register` - New hotel registration

### Bookings
- `GET /api/bookings` - Get hotel bookings
- `POST /api/bookings` - Create new booking
- `GET /api/available-rooms` - Check room availability

### Pricing
- `GET /api/pricing/recommendation` - Get price recommendation
- `GET /api/pricing/history` - Pricing history

### Dashboard
- WebSocket events for real-time updates

## Features Roadmap

- [ ] A/B testing framework for validating pricing effectiveness
- [ ] Competitor price monitoring integration
- [ ] Revenue analytics dashboard
- [ ] Multi-property management
- [ ] PMS system integrations
- [ ] Advanced ML predictions

## Known Limitations

- Single property support (MVP)
- No automated testing (manual validation only)
- Rule-based AI (not fully ML-powered)
- Limited to direct bookings (OTA integration pending)

## Future Improvements

1. **Testing** - Add Jest/Vitest unit & integration tests
2. **Scaling** - Redis caching, job queues for batch processing
3. **Analytics** - Revenue impact tracking and A/B testing
4. **Validation** - Real hotel deployment and data-driven optimization

## Author

Built as a portfolio project to demonstrate full-stack development and revenue optimization principles used in hotel pricing (yield management).
