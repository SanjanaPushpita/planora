# Planora — Personal Digital Planner & Productivity Sanctuary 🌿📖

Planora is an aesthetic, private, personal digital planner, habit tracker, study logger, and journal built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

Inspired by physical bullet journals, editorial typography, and modular productivity workspaces, Planora is **100% dynamic**: you can create, write, edit, delete, check off, rearrange, and manage everything directly from the UI without modifying source code.

---

## ✨ Features

- 📓 **Dynamic Page & Block System (Notion-like)**:
  - Create unlimited custom pages with your own names (e.g., *"Daily Planner - Sept 18"*, *"Exam Preparation"*, *"30 Day No Sugar Challenge"*, *"MSc Thesis Tracker"*).
  - Add, edit, delete, reorder (move up/down), and duplicate modular blocks within any page:
    - **To-Do Lists & Checklists** (with priorities, inline item adding, and completion toggles)
    - **Hourly Daily Schedule & Time Blocking**
    - **Habit Tracker Matrices** (adaptive 28..31 day columns, streaks, and completion rates)
    - **30/60/100-Day Challenge Grids** (soft organic numbered bubbles inspired by physical challenges)
    - **Study & Research Logs** (subject, topic, target vs. actual minutes, and notes)
    - **Water Hydration Counter** (interactive glasses with 1-click tracking)
    - **Mood & Sleep Tracker** (mood icons, sleep hours slider, and rest quality stars)
    - **Meal Planner** (breakfast, lunch, dinner, and snacks)
    - **Wins & Evening Reflections** (today's wins, improvements for tomorrow, and daily gratitude)
    - **Editorial Quotes** & **Decorative Dividers** (heart, botanical leaf, and clean line)
    - **Headings & Freeform Journaling Paragraphs**

- 🏠 **Personal Dashboard**:
  - Greeting banner customized to your name (*"This Journal Belongs To [Name]"*)
  - 1-click **Today's Habits** checkoff directly from the dashboard
  - **Today's Focus Tasks** widget with instant item completion
  - **Active Challenges** progress meters
  - Auto-saved **Quick Scratchpad** for fleeting thoughts and ideas
  - Fast template creator buttons

- 🌿 **Dedicated Habit Hub**:
  - Monthly calendar matrix adapting automatically to 28, 29, 30, or 31 days
  - Enter your own habits (no hardcoded limits)
  - Current streak and longest streak calculations
  - Per-habit and overall monthly completion percentages

- 📚 **Study & Research Sanctuary**:
  - Coursework & dissertation study logger
  - **12-Month Yearly Heatmap Matrix** (J F M A M J J A S O N D) color-coded by study duration (inspired by physical study logs)
  - Interactive **Focus Stopwatch / Pomodoro Timer** (15m, 25m, 50m focus blocks)

- 🌸 **Challenge Tracker**:
  - Create 7, 21, 30, 60, 75, 100-day or custom-length personal challenges
  - Soft numbered day bubbles with check animations and celebratory confetti

- 🗓️ **Interactive Calendar View**:
  - Full month calendar with subtle indicators for scheduled daily planners, habits, and tasks
  - Click or double-click any date to view or create that day's planner

- 🎨 **Theme System (5 Curated Palettes & Light/Dark Mode)**:
  - **Blush Rose**: Soft ballet pink and warm beige
  - **Sage Botanical**: Serene matcha green and natural linen
  - **Warm Paper**: Classic cream notebook and terracotta amber
  - **Minimalist**: Crisp charcoal and light neutral tones
  - **Lavender Mist**: Dreamy soft lilac and wisteria slate
  - Full Dark Mode support for every theme!

- ⚡ **Auto-Save & Real-time Feedback**:
  - Automatic debounced auto-saving on every keystroke and change
  - Status indicator in header (`Saving...` → `Saved`)
  - Flush on unmount to ensure you never lose text when switching pages

- 🔒 **Privacy Passcode & Lock Screen**:
  - Set an optional privacy passcode
  - 1-click lock from header with aesthetic paper cover lock screen (*"This Journal Belongs To..."*)

- 💾 **Data Ownership & Cloud Persistence**:
  - **Local-First Zero-Setup Engine**: Runs out of the box using browser storage; all data persists across reloads and browser restarts.
  - **Supabase Cloud Engine**: Connects seamlessly when Supabase credentials are provided in `.env.local` with full Row-Level Security (RLS) policies.
  - **JSON Export & Import**: Download a full JSON backup of your planner and restore anytime with schema validation.
  - **Trash Bin**: Soft delete pages with 1-click restore or permanent delete.

---

## 🛠️ Technology Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & CSS Variables
- **Icons**: Lucide React
- **Confetti**: Canvas Confetti
- **Cloud Database (Optional)**: Supabase (PostgreSQL with RLS)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Optional Supabase Cloud)

Planora works immediately with local storage. To connect to Supabase Cloud:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set your Supabase project credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Run the SQL migration script located in `supabase/schema.sql` in your Supabase SQL Editor.

---

## 📦 Building for Production

```bash
npm run build
npm run start
```

Suitable for 1-click deployment on [Vercel](https://vercel.com).
