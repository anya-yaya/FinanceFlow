## **FinanceFlow** 

Full-Stack Expense Tracker

FinanceFlow is a modern, responsive financial dashboard built with **Next.js**, **TypeScript**, and **MongoDB**. It allows users to track income and expenses, visualize spending habits through interactive charts, and gain automated financial insights.

## **Check out the live app here:** 

https://finance-flow-three-xi.vercel.app/
---

## ⭐ Key Features

### 1. Unified Dashboard
- **Real-time Totals:** Automatic calculation of Balance, Income, and Expenses.
- **Interactive Visuals:** Live Area Charts for balance trends and Pie Charts for spending breakdown using **Recharts**.
- **Quick Entry:** Streamlined form for adding transactions directly from the main view.

### 2. Advanced Transaction Management
- **Full Ledger:** A dedicated tab for viewing every transaction ever recorded.
- **Search & Sort:** Instantly filter transactions by description or category, and sort by amount.
- **Admin Controls:** Role-Based Access Control (RBAC) allows Admins to Add, Edit, and Delete data, while "User" mode provides a read-only experience.

### 3. Smart Insights
- **Savings Rate:** Automated calculation of your monthly savings percentage.
- **Behavior Tracking:** Identifies your most frequent spending categories.
- **Deep Dive:** Highlights your biggest single expense and provides a contextual financial health check.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Lucide React (Icons).
- **Backend:** Next.js API Routes (Serverless).
- **Database:** MongoDB Atlas with Mongoose.
- **Charts:** Recharts.
- **Notifications:** React Hot Toast.
- **Language:** TypeScript.

---

## ⚙️ Local Setup Instructions

Follow these steps to run the project on your local machine:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/anya-yaya/FinanceFlow.git]
   cd FinanceFlow

2. **Install dependcies:**
    ```bash
    npm install lucide-react react-hot-toast mongoose recharts
    
3. **Set up environmental variables:**
   
   Create a .env.local file in the root directory and add your MongoDB connection string:
   ```bash
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/FinanceFlow

4. Run the development server:
   ```bash
   npm run dev

  Open http://localhost:3000 in your browser
   
--- 

## 🛡️ Security & Roles

FinanceFlow implements a frontend/backend security bridge:

▫️Frontend: Logic gates hide administrative UI (Forms/Action buttons) based on the role state.

▫️Backend: API routes verify the x-user-role header before allowing POST, PATCH, or DELETE operations.

## 📜 License

This project is licensed under the MIT License. You are free to use, modify, and distribute this software.
