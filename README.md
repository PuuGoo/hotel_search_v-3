# Hotel Search NextJS

A comprehensive hotel search and management platform built with Next.js 13 (App Router), MongoDB, Tailwind CSS, Pusher, Next-Auth, and Cloudinary.

## Features

### Chat System (from Messenger Clone)
- Real-time chat update with Pusher
- Group chat support
- Direct messaging (DM)
- Delete chat history
- Image hosting with Cloudinary
- Dynamic Theme support (Light and Dark mode)
- Support for both Desktop and Mobile screens

### Hotel Search
- Multi-engine search (Tavily, Google, DuckDuckGo)
- Search history tracking
- Bookmark management with folders and tags
- Search statistics and analytics
- Dashboard with usage metrics

### User Management
- User registration and login
- OAuth support (GitHub, Google)
- Profile editing
- Role-based access control (admin/user)

## Tech Stack

- **Framework:** Next.js 13 (App Router)
- **Database:** MongoDB with Prisma ORM
- **Real-time:** Pusher
- **Authentication:** Next-Auth
- **Styling:** Tailwind CSS
- **Image Hosting:** Cloudinary
- **State Management:** Zustand
- **Forms:** React Hook Form
- **Notifications:** React Hot Toast

## Getting Started

### Prerequisites

1. Node.js 16+ installed
2. MongoDB database (Atlas or local)
3. Pusher account
4. Cloudinary account (optional, for image uploads)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hotel-search-nextjs
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:
- `DATABASE_URL` - MongoDB connection string
- `NEXTAUTH_SECRET` - Random string for NextAuth
- `NEXT_PUBLIC_PUSHER_APP_KEY` - Pusher app key
- `PUSHER_APP_ID` - Pusher app ID
- `PUSHER_SECRET` - Pusher secret
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `NEXT_PUBLIC_CLOUDINARY_PRESET_NAME` - Cloudinary upload preset

4. Initialize the database:
```bash
npx prisma db push
npx prisma generate
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (site)/           # Login page
│   ├── actions/          # Server actions
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth routes
│   │   ├── bookmarks/    # Bookmark API
│   │   ├── conversations/# Chat API
│   │   ├── hotels/       # Hotel API
│   │   ├── messages/     # Message API
│   │   ├── register/     # Registration API
│   │   ├── search/       # Search API
│   │   └── settings/     # Settings API
│   ├── components/       # Shared components
│   ├── conversations/    # Chat pages
│   ├── dashboard/        # Dashboard page
│   ├── hooks/            # Custom hooks
│   ├── hotels/           # Hotel search page
│   ├── libs/             # Utility libraries
│   ├── types/            # TypeScript types
│   └── users/            # Users page
├── middleware.ts          # Route protection
└── pages/                # Pages router (Pusher auth)
```

## API Endpoints

### Search
- `POST /api/search` - Perform a search
- `GET /api/search` - Get search history

### Bookmarks
- `POST /api/bookmarks` - Create bookmark
- `GET /api/bookmarks` - Get bookmarks
- `PATCH /api/bookmarks` - Update bookmark
- `DELETE /api/bookmarks` - Delete bookmark

### Conversations
- `POST /api/conversations` - Create conversation
- `DELETE /api/conversations/[id]` - Delete conversation
- `POST /api/conversations/[id]/seen` - Mark as seen

### Messages
- `POST /api/messages` - Send message

### Auth
- `POST /api/register` - Register user
- `POST /api/settings` - Update profile

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [NextJs-Messenger-Clone](https://github.com/Tasin5541/NextJs-Messenger-Clone) - Base chat system
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Pusher](https://pusher.com/) - Real-time messaging
- [Prisma](https://www.prisma.io/) - Database ORM
