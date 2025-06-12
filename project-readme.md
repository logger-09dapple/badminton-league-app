# Badminton League Manager

A web-based application for organizing and managing badminton tournaments with automated scheduling, score tracking, and league standings.

## 🚀 Live Demo

Your app will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## 📋 Features

- **Team Registration**: Add teams with player rosters
- **Automated Scheduling**: Generate round-robin tournament matches
- **Score Tracking**: Input match results and update standings
- **Live Standings**: Real-time league table with points calculation
- **Responsive Design**: Works on desktop and mobile devices
- **Cloud Storage**: Data persisted with Supabase backend

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6 modules)
- **Backend**: Supabase (PostgreSQL database)
- **Hosting**: GitHub Pages
- **Authentication**: Supabase Auth (optional)

## ⚡ Quick Setup

### 1. Supabase Configuration

Replace the placeholders in `index.html`:

```javascript
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';
```

### 2. Database Schema

Create these tables in your Supabase project:

```sql
-- Teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    players TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    team1_id INTEGER REFERENCES teams(id),
    team2_id INTEGER REFERENCES teams(id),
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### 3. Enable Row Level Security

```sql
-- Enable RLS on tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON matches FOR UPDATE USING (true);
```

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload all files to the repository
3. Go to Settings → Pages
4. Select "Deploy from branch" → "main" → "/ (root)"
5. Your app will be live in 5-10 minutes!

## 📁 Project Structure

```
your-repo/
├── index.html              # Main application file
├── app.js                  # Application logic (use the provided sample)
├── README.md              # This file
└── assets/                # Optional: images, additional CSS
```

## 🔧 Customization

### Styling
- Modify the CSS in `index.html` to match your preferences
- Add your logo or team colors
- Customize the layout and components

### Functionality
- Add authentication for user-specific leagues
- Implement different tournament formats
- Add player statistics tracking
- Include match scheduling with dates/times

### Scoring System
Current implementation uses:
- 3 points for a win
- 1 point for a draw
- 0 points for a loss

Modify the `calculateStandings()` function to change scoring rules.

## 🔒 Security Considerations

### ✅ Safe Practices
- Using Supabase anon (public) key in frontend code
- Row Level Security (RLS) enabled on all tables
- HTTPS encryption via GitHub Pages

### ❌ Never Do
- Include service role keys in frontend code
- Disable RLS on public tables
- Store sensitive data without proper policies

## 🐛 Troubleshooting

### Common Issues

1. **404 Error**: Ensure `index.html` is in the root directory
2. **App Not Updating**: Wait 5-10 minutes for GitHub Pages to rebuild
3. **Supabase Errors**: Check browser console for connection issues
4. **Database Errors**: Verify RLS policies are correctly configured

### Debug Steps

1. Open browser developer tools (F12)
2. Check the Console tab for JavaScript errors
3. Verify Network tab shows successful API calls
4. Test Supabase connection in the browser console:

```javascript
// Test in browser console
const testData = await supabase.from('teams').select('*');
console.log(testData);
```

## 📱 Mobile Support

The app is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Various screen sizes and orientations

## 🚀 Performance Tips

- Images are automatically optimized by GitHub Pages
- CSS and JavaScript are minified for faster loading
- CDN delivery ensures global accessibility
- Minimal dependencies for quick load times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🆘 Support

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community Discord](https://discord.supabase.com)

---

**Happy organizing! 🏸**