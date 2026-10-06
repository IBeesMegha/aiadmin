# Next.js Dynamic CMS

A full-stack, Strapi-like CMS built with Next.js, PostgreSQL, Prisma, and TypeScript. Features a dynamic Content-Type Builder with **runtime table creation**, **knowledge base with RAG (Retrieval-Augmented Generation)**, **RBAC**, and **i18n** support.

---

## 🚀 Quick Start (Fresh Clone)

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| PostgreSQL | 12+ |
| npm | any recent |

### Step-by-Step Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd nextjs-cms
npm install

# 2. Configure environment variables
cp .env.example .env
```

### Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:root@localhost:5433/strap_admin` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | *(change in production)* |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | *(change in production)* |

### Optional Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key (free tier) | Embeddings + LLM answer generation |
| `GROQ_API_KEY` | Groq API key (fallback LLM) | LLM answer generation (if HF unavailable) |

> **Note:** At least one of `HUGGINGFACE_API_KEY` or `GROQ_API_KEY` is required for knowledge base search (AI-generated answers). If neither is set, the search API will throw an error.

### Initialize Database

```bash
# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations (creates core system tables only)
npx prisma migrate dev

# 5. Seed the database (creates roles, permissions, languages, and super admin)
npx prisma db seed
```

### Default Super Admin Credentials

After seeding, you can log in with:
- **Email:** `admin@example.com`
- **Password:** `Admin@123`

> **Important:** Change these credentials immediately after first login in production.

### Start Development

```bash
# 6. Start dev server
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin panel.

### What the Seed Creates

| Item | Count | Details |
|------|-------|---------|
| Permissions | 30+ | Dashboard, Users, Roles, Content, Media, KB, i18n |
| Roles | 2 | Super Admin (full access), Editor (content-only) |
| Users | 1 | Super admin (`admin@example.com` / `Admin@123`) |
| Languages | 3 | English (default), Hindi, French |

---

## 🚀 Key Features

### 🎯 Hybrid Database Architecture
- **Static Core Tables**: Managed by Prisma (CollectionType, SingleType, Component, Media)
- **Dynamic Content Tables**: Created at runtime via raw SQL (Blog, News, Product, etc.)
- **No Schema Pollution**: `schema.prisma` stays clean forever
- **No Server Restarts**: Changes are live immediately
- **No Migration Conflicts**: Fresh clones only create core tables

### 🔗 Metadata-Driven Relations
- **Automatic Bidirectional Relations**: Creating `Blog.category` automatically creates `Category.blogs`
- **Virtual Inverse Relations**: Inverse relations exist only in metadata, not as physical columns
- **Owner-Based Foreign Keys**: Only the owning side has a physical FK column
- **Dynamic Resolution**: Relations resolved at runtime via SQL joins
- **All Relation Types**: oneToOne, oneToMany, manyToOne, manyToMany

### 📦 Content Types
- **Collection Types**: Multiple entries with full CRUD operations
- **Single Types**: Singleton content (Homepage, Settings)
- **Components**: Reusable content blocks
- **Dynamic Zones**: Flexible component arrays

### 🛠️ Dynamic Content-Type Builder
- Create content types through the UI
- Add/remove fields on the fly
- Support for 13+ field types
- Relations between collections
- Real-time schema synchronization

### 🎨 Admin Panel
- Modern, responsive UI with Tailwind CSS
- Dynamic form generation
- Media library with folder organization
- Rich text editor (CKEditor)
- Full CRUD operations

## 🏗️ Architecture

### Hybrid Database Approach

This CMS uses a **unique hybrid architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STATIC TABLES (Managed by Prisma)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │CollectionType│  │  SingleType  │  │  Component   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ComponentEntry│  │    Media     │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
│  DYNAMIC TABLES (Created at Runtime via Raw SQL)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     blog     │  │     news     │  │   product    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   category   │  │  ... more    │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why This Approach?

**Traditional CMS Problem:**
- Dynamic models written to `schema.prisma`
- Migrations created for every collection
- Fresh clones recreate deleted tables
- Server restart required after changes

**Our Solution:**
- ✅ `schema.prisma` contains only 5 core models
- ✅ Dynamic tables created via raw SQL at runtime
- ✅ Fresh clones only create core infrastructure
- ✅ No server restarts needed
- ✅ No migration conflicts

### Technical Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM + Raw SQL
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS
- **Rich Text**: CKEditor 5

## 📁 Project Structure

```
nextjs-cms/
├── components/admin/          # Admin UI components
├── lib/
│   ├── dynamic-table-service.ts   # 🆕 Runtime table management
│   ├── dynamic-prisma.ts          # CRUD for dynamic tables
│   ├── prisma.ts                  # Prisma client
│   └── types.ts                   # TypeScript types
├── pages/
│   ├── admin/                     # Admin panel pages
│   └── api/                       # API routes
├── prisma/
│   └── schema.prisma              # 🔒 Static core tables only
├── ARCHITECTURE.md                # 📖 Architecture deep dive
├── MIGRATION_CLEANUP.md           # 🔧 Migration guide
├── EXAMPLES.md                    # 💡 Code examples
├── QUICK_REFERENCE.md             # ⚡ Quick reference
└── REFACTOR_SUMMARY.md            # 📝 What changed
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Initialize database (creates ONLY core tables)
npx prisma generate
npx prisma migrate dev --name init

# 4. Start development server
npm run dev

# 5. Access admin panel
# Open http://localhost:3000/admin
```

### What Gets Created?

After running migrations, you'll have **only 5 core tables**:
- `CollectionType` - Metadata for dynamic collections
- `SingleType` - Singleton content types
- `Component` - Reusable component definitions
- `ComponentEntry` - Component instances
- `Media` - Media library

**No Blog, News, or Product tables yet!** These are created when you define them via the UI.

### Creating Your First Collection

1. Go to `/admin/content-type-builder`
2. Click "Create Collection Type"
3. Name it "Blog", add fields (title, content, etc.)
4. Click "Create" → Table is created instantly via raw SQL
5. No schema.prisma modification
6. No server restart needed
7. Start adding blog posts immediately!

## 📖 Usage Guide

### Creating a Collection Type

```typescript
// Via UI: /admin/content-type-builder
// Or via API:
POST /api/collection-types
{
  "name": "blog",
  "displayName": "Blog",
  "fields": {
    "fields": [
      { "name": "title", "type": "string", "required": true },
      { "name": "content", "type": "richtext" },
      { "name": "published", "type": "boolean" }
    ]
  }
}

// Result: Table "blog" created instantly via raw SQL
// No schema.prisma modification
// No server restart needed
```

### CRUD Operations

```typescript
import {
  findManyDynamic,
  createDynamic,
  updateDynamic,
  deleteDynamic
} from '@/lib/dynamic-prisma';

// Create
const post = await createDynamic('blog', {
  title: 'Hello World',
  content: '<p>My first post</p>',
  published: true
});

// Read
const posts = await findManyDynamic('blog');

// Update
await updateDynamic('blog', post.id, {
  title: 'Updated Title'
});

// Delete
await deleteDynamic('blog', post.id);
```

### Adding Fields to Existing Collection

```typescript
// Via UI: Edit collection in Content-Type Builder
// Or via API:
PUT /api/collection-types/blog
{
  "fields": {
    "fields": [
      { "name": "title", "type": "string", "required": true },
      { "name": "content", "type": "richtext" },
      { "name": "author", "type": "string" } // NEW FIELD
    ]
  }
}

// Result: ALTER TABLE "blog" ADD COLUMN "author" TEXT
// No schema.prisma modification
// No server restart needed
```

## 🗄️ Database Architecture

### Core Tables (Managed by Prisma)

These tables are defined in `schema.prisma` and managed by Prisma migrations:

```prisma
model CollectionType {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  fields      Json     // Field definitions
  // ...
}

model SingleType { /* ... */ }
model Component { /* ... */ }
model ComponentEntry { /* ... */ }
model Media { /* ... */ }
```

### Dynamic Tables (Managed by Raw SQL)

These tables are created at runtime when you define collections:

```sql
-- Created when you define "Blog" collection
CREATE TABLE "blog" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  published BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Created when you define "Product" collection
CREATE TABLE "product" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  "categoryId" TEXT,  -- Foreign key for relations
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Fresh Clone Behavior

```bash
# Clone repository
git clone <repo>

# Run migrations
npx prisma migrate dev

# Result: Only 5 core tables created
# ✅ CollectionType, SingleType, Component, ComponentEntry, Media
# ❌ NO blog, news, product tables
# ✅ Clean starting point

# Create collections via UI
# → Tables created dynamically
# → No schema.prisma modification
```

### Benefits

| Old Approach | New Approach |
|--------------|--------------|
| ❌ Dynamic models in schema.prisma | ✅ Static schema.prisma |
| ❌ Migrations for every collection | ✅ No migrations for collections |
| ❌ Fresh clones recreate deleted tables | ✅ Fresh clones only create core tables |
| ❌ Server restart required | ✅ No restart needed |
| ❌ Git conflicts on schema file | ✅ Clean git history |

📖 **For detailed information**, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔌 API Routes

### Collection Types
- `GET /api/collection-types` - List all collection types
- `POST /api/collection-types` - Create collection type
- `GET /api/collection-types/[name]` - Get specific collection type
- `PUT /api/collection-types/[name]` - Update collection type
- `DELETE /api/collection-types/[name]` - Delete collection type

### Collection Entries
- `GET /api/collections/[name]` - List entries
- `POST /api/collections/[name]` - Create entry
- `GET /api/collections/[name]/[id]` - Get entry
- `PUT /api/collections/[name]/[id]` - Update entry
- `DELETE /api/collections/[name]/[id]` - Delete entry

### Single Types
- `GET /api/single-types` - List all single types
- `POST /api/single-types` - Create single type
- `GET /api/single-types/[name]` - Get single type
- `PUT /api/single-types/[name]` - Update single type (structure or data)
- `DELETE /api/single-types/[name]` - Delete single type

### Components
- `GET /api/components` - List all components
- `POST /api/components` - Create component
- `GET /api/components/[name]` - Get component
- `PUT /api/components/[name]` - Update component
- `DELETE /api/components/[name]` - Delete component

## 🎨 Field Types

| Type | PostgreSQL Type | Description | Example |
|------|----------------|-------------|---------|
| `string` | TEXT | Short text | `"Hello World"` |
| `text` | TEXT | Long text | `"Long description..."` |
| `richtext` | TEXT | HTML content | `"<p>Rich text</p>"` |
| `richtext-ckeditor` | TEXT | CKEditor content | `"<p>CKEditor</p>"` |
| `number` | DOUBLE PRECISION | Numeric values | `42.5` |
| `boolean` | BOOLEAN | True/false | `true` |
| `date` | TIMESTAMP(3) | Date/time | `"2024-01-01"` |
| `email` | TEXT | Email address | `"user@example.com"` |
| `json` | JSONB | JSON data | `{"key": "value"}` |
| `media` (single) | TEXT | Media URL | `"https://..."` |
| `media` (multiple) | JSONB | Media array | `["url1", "url2"]` |
| `component` | JSONB | Component data | `{"field": "value"}` |
| `dynamiczone` | JSONB | Component array | `[{...}, {...}]` |
| `relation` | TEXT | Foreign key | `"clx123..."` |

### Relation Types

| Type | Description | Example |
|------|-------------|---------|
| `oneToOne` | 1:1 relationship | User ↔ Profile |
| `manyToOne` | N:1 relationship | Product → Category |
| `oneToMany` | 1:N relationship | Category → Products |
| `manyToMany` | N:N relationship | Post ↔ Tags |

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture explanation
- **[RELATION_SYSTEM.md](./RELATION_SYSTEM.md)** - Metadata-driven relation system
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference guide
- **[EXAMPLES.md](./EXAMPLES.md)** - Code examples and patterns
- **[MIGRATION_CLEANUP.md](./MIGRATION_CLEANUP.md)** - Migration guide
- **[REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)** - What changed

## 🚧 Roadmap

- [x] Dynamic table creation via raw SQL
- [x] No schema.prisma modifications
- [x] No server restarts needed
- [x] Relations between collections
- [x] Media library with folders
- [x] Rich text editor (CKEditor)
- [x] Components and dynamic zones
- [ ] User authentication and roles
- [ ] API token generation
- [ ] Internationalization (i18n)
- [ ] Content versioning
- [ ] Webhooks
- [ ] GraphQL API

## 🔐 Security

### SQL Injection Prevention

All table and column names are validated:

```typescript
import { validateSqlIdentifier } from '@/lib/dynamic-table-service';

// ✅ Safe
validateSqlIdentifier('blog')        // true
validateSqlIdentifier('blog_posts')  // true

// ❌ Blocked
validateSqlIdentifier('blog; DROP')  // false
validateSqlIdentifier('blog--')      // false
```

All queries use parameterization:

```typescript
// ✅ Safe - parameterized
await prisma.$queryRawUnsafe(
  'SELECT * FROM "blog" WHERE id = $1',
  userId
);

// ❌ Unsafe - string concatenation
await prisma.$queryRawUnsafe(
  `SELECT * FROM "blog" WHERE id = '${userId}'`
);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

Inspired by [Strapi](https://strapi.io/) - the leading open-source headless CMS.
