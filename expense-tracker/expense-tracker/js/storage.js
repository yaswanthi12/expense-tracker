/* =========================================================
   STORAGE.JS
   Handles all Local Storage persistence for the app:
   - Transactions CRUD
   - Monthly budgets
   - Theme preference
   Exposes a single global `Storage` object used by app.js
   ========================================================= */

const Storage = (() => {
  const KEYS = {
    TRANSACTIONS: 'expenseTracker_transactions',
    BUDGETS: 'expenseTracker_budgets', // { "2026-06": 15000 }
    THEME: 'expenseTracker_theme',
  };

  // ---------- Category definitions (shared with app.js via Storage.CATEGORIES) ----------
  const CATEGORIES = {
    income: [
      { name: 'Salary', icon: 'fa-money-check-dollar' },
      { name: 'Freelancing', icon: 'fa-laptop-code' },
      { name: 'Business', icon: 'fa-briefcase' },
      { name: 'Other', icon: 'fa-circle-plus' },
    ],
    expense: [
      { name: 'Food', icon: 'fa-utensils' },
      { name: 'Travel', icon: 'fa-plane' },
      { name: 'Shopping', icon: 'fa-bag-shopping' },
      { name: 'Bills', icon: 'fa-file-invoice-dollar' },
      { name: 'Entertainment', icon: 'fa-film' },
      { name: 'Health', icon: 'fa-heart-pulse' },
      { name: 'Education', icon: 'fa-graduation-cap' },
      { name: 'Other', icon: 'fa-ellipsis' },
    ],
  };

  /** Safely parse JSON from localStorage, returning a fallback on failure. */
  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error(`Storage: failed to read ${key}`, e);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Storage: failed to write ${key}`, e);
      return false;
    }
  }

  // ---------- Transactions ----------
  function getTransactions() {
    return safeGet(KEYS.TRANSACTIONS, []);
  }

  function saveTransactions(transactions) {
    return safeSet(KEYS.TRANSACTIONS, transactions);
  }

  function addTransaction(txn) {
    const transactions = getTransactions();
    transactions.unshift(txn); // newest first
    saveTransactions(transactions);
    return transactions;
  }

  function updateTransaction(id, updatedFields) {
    const transactions = getTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      transactions[idx] = { ...transactions[idx], ...updatedFields };
      saveTransactions(transactions);
    }
    return transactions;
  }

  function deleteTransaction(id) {
    const transactions = getTransactions().filter((t) => t.id !== id);
    saveTransactions(transactions);
    return transactions;
  }

  // ---------- Budgets (per month, keyed "YYYY-MM") ----------
  function getBudgets() {
    return safeGet(KEYS.BUDGETS, {});
  }

  function getBudgetForMonth(monthKey) {
    const budgets = getBudgets();
    return budgets[monthKey] || 0;
  }

  function setBudgetForMonth(monthKey, amount) {
    const budgets = getBudgets();
    budgets[monthKey] = amount;
    safeSet(KEYS.BUDGETS, budgets);
  }

  // ---------- Theme ----------
  function getTheme() {
    return safeGet(KEYS.THEME, 'dark');
  }

  function setTheme(theme) {
    safeSet(KEYS.THEME, theme);
  }

  return {
    CATEGORIES,
    getTransactions,
    saveTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getBudgets,
    getBudgetForMonth,
    setBudgetForMonth,
    getTheme,
    setTheme,
  };
})();
