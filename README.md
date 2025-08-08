# Brain Nucleus - Fullstack Starter Template

A modern fullstack starter template built with Next.js 14 (App Router), TypeScript, Supabase, and Tailwind CSS. Perfect for rapid prototyping and building scalable B2B/B2C applications.

## Features

- **Authentication**: Complete auth flow with Supabase Auth (login, signup, logout)
- **Dashboard**: Protected dashboard with user data and task management
- **CRUD Operations**: Full CRUD example with tasks
- **Server Components**: Leverages React Server Components for optimal performance
- **Server Actions**: Form handling with Next.js Server Actions
- **Type Safety**: Full TypeScript support with Zod validation
- **UI Components**: Beautiful UI with Tailwind CSS and shadcn/ui
- **Database**: PostgreSQL via Supabase with Row Level Security
- **Middleware Protection**: Route protection at middleware level

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Deployment**: Vercel-ready

## Project Structure

```
/app
  /auth           # Authentication pages
    /login
    /signup
  /dashboard      # Protected dashboard
  /actions        # Server actions
/components
  /ui            # shadcn/ui components
  /auth          # Auth-specific components
  /dashboard     # Dashboard components
/lib
  /supabase      # Supabase client configuration
  utils.ts       # Utility functions
/validators      # Zod schemas
/types          # TypeScript types
/middleware.ts  # Auth middleware
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd brain-nucleus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:

Run the migration script in your Supabase SQL editor:
```sql
-- Located in: lib/supabase/migrations/001_initial_schema.sql
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Database Setup

The application includes a migration file for setting up the initial database schema:

1. Go to your Supabase project SQL editor
2. Run the migration from `lib/supabase/migrations/001_initial_schema.sql`
3. This will create:
   - Tasks table with RLS policies
   - Updated_at trigger
   - Required extensions

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features Breakdown

### Authentication
- Email/password authentication
- Protected routes with middleware
- User session management
- Automatic redirects for authenticated/unauthenticated users

### Task Management
- Create, read, update, delete tasks
- Task properties: title, description, status, priority, due date
- Real-time updates with Server Actions
- Row Level Security ensures users only see their own tasks

### UI Components
- Button, Input, Label, Card, Dialog, Badge
- Consistent design system with Tailwind CSS
- Dark mode support (CSS variables configured)
- Responsive design

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker (Optional)

Dockerfile can be added for containerized deployment.

## Security

- Row Level Security (RLS) enabled on all tables
- Secure authentication with Supabase Auth
- Environment variables for sensitive data
- Server-side validation with Zod
- CSRF protection with Server Actions

## Future Enhancements

- [ ] Email verification
- [ ] Password reset flow
- [ ] User profile management
- [ ] File uploads with Supabase Storage
- [ ] Real-time features with Supabase Realtime
- [ ] Internationalization (i18n)
- [ ] Error logging and monitoring
- [ ] API rate limiting
- [ ] Advanced search and filtering
- [ ] Notifications system

## Contributing

Feel free to submit issues and pull requests.

## License

MIT

## Support

For issues or questions, please open an issue in the repository.