import { Hono } from "hono";
import { db } from "@/db/drizzle";
import { parse, subDays } from "date-fns";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { accounts, categories, insertCategorySchema, insertTransactionsSchema, transactions } from "@/db/schema";

const app = new Hono()
  .get("/", 
    zValidator("query", z.object({
      from: z.string().optional(),    //filter by date and account id's -> optional
      to: z.string().optional(),
      accountId: z.string().optional(),
    })),
    clerkMiddleware(), 
    async (c) => {
    const auth = getAuth(c);
    const { from, to, accountId } = c.req.valid("query");

    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // get the last 30 days if no date is provided
    const defaultTo = new Date();
    const defaultFrom = subDays(defaultTo, 30);

    const startDate = from ? parse(from, "yyyy-MM-dd", new Date()) 
    : defaultFrom;
    
    const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) 
    : defaultTo;

    const data = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        category: categories.name,
        categoryId: transactions.categoryId,
        payee: transactions.payee,
        amount: transactions.amount,
        notes: transactions.notes,
        accountId: transactions.accountId,
        account: accounts.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id),)
      .leftJoin(categories, eq(transactions.categoryId, categories.id),)
      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined, // filter by account id ( optional )
          eq(accounts.userId, auth.userId), // only allow the user to access their own transactions
          gte(transactions.date, startDate),
          lte(transactions.date, endDate) 
        )
      )
      .orderBy(desc(transactions.date));

    return c.json({ data });
  })
  .get(
    "/:id",
    clerkMiddleware(),
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [data] = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          categoryId: transactions.categoryId,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.id, id), // only allow the user to access the transaction they requested
            eq(accounts.userId, auth.userId), // only allow the user to access their own transactions
          )
        );

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    }
  )
  .post(
    "/",
    clerkMiddleware(),
    zValidator(
      "json",
      insertTransactionsSchema.omit({
        id: true,
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [data] = await db
        .insert(transactions) // insert into transactions schema
        .values({
          id: createId(), //generate a new id
          ...values, // set the name to the value passed in the request
        })
        .returning();

      return c.json({ data });
    }
  )
  .post(
    "/bulk-delete",
    clerkMiddleware(),
    zValidator(
      "json",
      z.object({
        ids: z.array(z.string()),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const transactionsToDelete = db.$with("transactions_to_delete").as(
        db.select({id: transactions.id}).from(transactions) // select all transactions requested to be deleted
        .innerJoin(accounts, eq(transactions.accountId, accounts.id)) // join with accounts
        .where(and(
          inArray(transactions.id, values.ids), // only allow the user to delete transactions they requested
          eq(accounts.userId, auth.userId) // only allow the user to delete their own transactions
        ))
      )

      const data = await db
        .with(transactionsToDelete)
        .delete(transactions)
        .where(
          eq(transactions.id, sql`(select id from ${transactionsToDelete})`) // delete the transactions selected in the with clause
        )
        .returning({
          id: transactions.id,
        });

      return c.json({ data });
    }
  )
  .patch(
    "/:id",
    clerkMiddleware(),
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      })
    ),
    zValidator(
      "json",
      insertTransactionsSchema.omit({
        id: true,
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const transactionsToUpdate = db.$with("transactions_to_update").as(
        db
          .select({ id: transactions.id })
          .from(transactions) // select all transactions requested to be updated
          .innerJoin(accounts, eq(transactions.accountId, accounts.id)) // join with accounts
          .where(
            and(
              eq(transactions.id, id), // only allow the user to update transactions they requested
              eq(accounts.userId, auth.userId) // only allow the user to delete their own transactions
            )
          )
      );

      const [data] = await db
        .with(transactionsToUpdate)
        .update(transactions)
        .set(values)
        .where(
          inArray(transactions.id, sql`(select id from ${transactionsToUpdate})`) // update the transactions selected in the with clause
        )
        .returning();

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    }
  )
  .delete(
    "/:id",
    clerkMiddleware(),
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json({ error: "Missing id" }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const transactionsToDelete = db.$with("transactions_to_delete").as(
        db
          .select({ id: transactions.id })
          .from(transactions) // select all transactions requested to be deleted
          .innerJoin(accounts, eq(transactions.accountId, accounts.id)) // join with accounts
          .where(
            and(
              eq(transactions.id, id), // only allow the user to delete transactions they requested
              eq(accounts.userId, auth.userId) // only allow the user to delete their own transactions
            )
          )
      );


      const [data] = await db
        .with(transactionsToDelete)
        .delete(transactions)
        .where(
          inArray(
            transactions.id,
            sql`(select id from ${transactionsToDelete})`
          )
        )
        .returning({
          id: transactions.id,
        });

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    }
  );


export default app;
