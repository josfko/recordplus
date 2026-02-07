# Git Workflow - RecordPlus

## Repository

- **GitHub**: https://github.com/josfko/recordplus
- **Branch**: `main`

## Quick Commands

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull
```

## Commit Message Convention

Use descriptive messages with a prefix:

```bash
git commit -m "feat: add new billing module"
git commit -m "fix: resolve date formatting issue"
git commit -m "style: update dashboard styles"
git commit -m "refactor: simplify case service logic"
git commit -m "docs: update README"
```

**Prefixes:**

- `feat:` - New feature
- `fix:` - Bug fix
- `style:` - CSS/styling changes
- `refactor:` - Code restructuring
- `docs:` - Documentation
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

## Feature Branch Workflow (Recommended)

For larger features, use branches:

```bash
# Create and switch to new branch
git checkout -b feature/new-feature-name

# Work on your changes...
git add .
git commit -m "feat: implement new feature"

# Push branch to GitHub
git push -u origin feature/new-feature-name

# After review, merge to main
git checkout main
git pull
git merge feature/new-feature-name
git push

# Delete feature branch
git branch -d feature/new-feature-name
```

## Common Scenarios

### Undo last commit (keep changes)

```bash
git reset --soft HEAD~1
```

### Discard all local changes

```bash
git checkout -- .
```

### View commit history

```bash
git log --oneline -10
```

### Stash changes temporarily

```bash
git stash
# ... do other work ...
git stash pop
```

## Project Structure

```
recordplus/
├── src/
│   ├── client/          # Frontend (HTML, CSS, JS)
│   │   ├── css/
│   │   ├── js/
│   │   │   └── components/
│   │   └── index.html
│   └── server/          # Backend (Node.js)
│       ├── routes/
│       ├── services/
│       └── index.js
├── migrations/          # Database migrations
├── data/               # SQLite database
└── package.json
```

## Deployment Notes

- **Backend**: Clouding.io VPS (Node.js)
- **Frontend**: Cloudflare Pages
- **Database**: SQLite (better-sqlite3)
