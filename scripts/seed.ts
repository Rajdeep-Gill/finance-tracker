import { accounts, categories, transactions } from "@/db/schema";
import { neon } from "@neondatabase/serverless";
import { subDays } from "date-fns";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";


config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const SEED_USER_ID = "user_2ofnaUxTAHNKfYle1WD6AtjwKFT";

const SEED_CATEGORIES = [
  {id: "category_1", name: "Food", userId: SEED_USER_ID, plaidId: null},
  {id: "category_2", name: "Rent", userId: SEED_USER_ID, plaidId: null},
  {id: "category_3", name: "Utilities", userId: SEED_USER_ID, plaidId: null},
  {id: "category_7", name: "Clothing", userId: SEED_USER_ID, plaidId: null},
]

const SEED_ACCOUNTS = [
  { id: "account_1", name: "Checking", userId: SEED_USER_ID, plaidId: null },
  { id: "account_2", name: "Savings", userId: SEED_USER_ID, plaidId: null },
]

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 60);

const SEED_TRANSACTIONS: typeof transactions.$inferSelect[] = [];

import { eachDayOfInterval, format } from "date-fns";
import { convertAmountToMilliunits } from "@/lib/utils";

const generateRandomAmount = ( category: typeof categories.$inferInsert ) => {
  switch (category.name) {
    case "Food":
      return Math.random() * 20 + 10;
    case "Rent":
      return Math.random() * 500 + 100;
    case "Utilities":
      return Math.random() * 200 + 50;
    case "Clothing":
      return Math.random() * 100 + 20;
    default:
      return Math.random() * 100;
  }
}

const generateTransactionsPerDay = ( day: Date ) => {
  const numTransactions = Math.floor(Math.random() * 4) + 1;

  for (let i = 0; i < numTransactions; i++){
    const category = SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
    const isExpense = Math.random() > 0.5;
    const amount = generateRandomAmount(category) * (isExpense ? -1 : 1);

    SEED_TRANSACTIONS.push({
      id: `transaction_${SEED_TRANSACTIONS.length + 1}`,
      accountId: SEED_ACCOUNTS[0].id,
      date: day,
      amount: convertAmountToMilliunits(amount),
      categoryId: category.id,
      payee: "Merchant",
      notes: "Seed data",
    })
  }
}

const generateTransactions = () => {
  const days = eachDayOfInterval({ start: defaultFrom, end: defaultTo });

  days.forEach((day) => {
    generateTransactionsPerDay(day);
  });
}
generateTransactions();

const main = async () => {
  try {
    await db.delete(transactions).execute();
    await db.delete(categories).execute();
    await db.delete(accounts).execute();

    await db.insert(categories).values(SEED_CATEGORIES).execute();
    await db.insert(accounts).values(SEED_ACCOUNTS).execute();
    await db.insert(transactions).values(SEED_TRANSACTIONS).execute();

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();