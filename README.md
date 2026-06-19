# 💰 Smart Expense Tracker

A modern, fully responsive personal finance dashboard built with vanilla HTML, CSS, and JavaScript (ES6) — no frameworks, no build step. Tracks income and expenses, visualizes spending with Chart.js, and persists everything locally in the browser.

![Tech](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![Tech](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![Tech](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Tech](https://img.shields.io/badge/Chart.js-FF6384?logo=chartdotjs&logoColor=white)

## ✨ Features

- **Dashboard** — total income, total expenses, current balance, monthly savings, and quick stats in glassmorphism cards
- **Add / Edit / Delete Transactions** — full CRUD with inline form validation
- **Transaction History** — searchable, filterable (type / category / date range), sortable table
- **Categories** — predefined Income (Salary, Freelancing, Business, Other) and Expense (Food, Travel, Shopping, Bills, Entertainment, Health, Education, Other) categories
- **Analytics** — live-updating Pie chart (expense distribution), Bar chart (monthly income vs. expense), and Line chart (spending trend)
- **Monthly Summary** — income, expenses, savings, top spending category, transaction count
- **Budgeting** — set a monthly budget, visual progress bar, automatic over-budget alerts
- **Export** — download transactions as CSV, generate a plain-text monthly report
- **Dark / Light Mode** — theme preference persisted across sessions
- **Fully Responsive** — optimized layouts for desktop, tablet, and mobile (collapsible sidebar nav)
- **Local Storage Persistence** — all data survives page refresh, no backend required

## 🗂️ Project Structure

```
expense-tracker/
│
├── index.html          # App shell & markup for all sections
├── css/
│   └── style.css       # Design tokens, layout, components, responsive rules
├── js/
│   ├── app.js           # State management, rendering, event handlers
│   ├── chart.js          # Chart.js setup & theme-aware chart updates
│   └── storage.js         # Local Storage CRUD abstraction
└── assets/              # (reserved for any static assets)
```

## 🚀 Getting Started

No build tools or dependencies to install — it's plain static files.

1. Download / clone the `expense-tracker` folder.
2. Open `index.html` directly in a browser, **or** serve it locally for the best experience:

   ```bash
   # Python 3
   python -m http.server 8000

   # or Node
   npx serve .
   ```
3. Visit `http://localhost:8000` and start adding transactions.

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Markup | Semantic HTML5 |
| Styling | CSS3 with custom properties (design tokens), Flexbox/Grid, glassmorphism |
| Logic | Vanilla JavaScript (ES6 modules via IIFE pattern) |
| Charts | [Chart.js 4](https://www.chartjs.org/) |
| Icons | [Font Awesome 6](https://fontawesome.com/) |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (figures) |
| Persistence | Browser `localStorage` |

## 📐 Architecture Notes

- **`storage.js`** is the single source of truth for reading/writing `localStorage`. It exposes a small API (`getTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction`, budget getters/setters, theme getters/setters) so the rest of the app never touches `localStorage` directly.
- **`chart.js`** owns all three Chart.js instances and re-creates them with theme-correct colors whenever dark/light mode changes.
- **`app.js`** holds in-memory state (`transactions`, active filters, sort order), derives all dashboard/analytics numbers from that state, and re-renders the relevant DOM sections after every mutation.
- Currency values use `en-IN` locale formatting (₹ symbol, Indian digit grouping).

## 🎓 Why This Project

This project was built as a portfolio piece to demonstrate:
- DOM manipulation and state management without a framework
- Working with `localStorage` for client-side persistence
- Data visualization with a charting library
- Responsive, accessible UI design (keyboard focus states, reduced-motion support)
- Form validation and UX polish (toasts, modals, empty states)

Feel free to fork, extend, or use this as a base for a backend-integrated version (Node/Express + MongoDB, for example) as a next step.

## 📄 License

Free to use for learning, portfolio, and resume purposes.
