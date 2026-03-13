import { PrismaClient } from "../lib/generated/prisma";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const chatHistories = await prisma.chatHistory.findMany({
    select: { id: true },
  });

  if (chatHistories.length === 0) {
    console.log("No chat histories to migrate.");
    return;
  }

  const db = (prisma as unknown as { $queryRawUnsafe: (q: string) => Promise<Array<{ id: string; chatHistory: string }>> }).$queryRawUnsafe;
  const rows: Array<{ id: string; chatHistory: string }> = await db.call(
    prisma,
    `SELECT ch.id, g.chatHistory FROM ChatHistory ch INNER JOIN Goal g ON g.chatHistoryId = ch.id WHERE g.chatHistory IS NOT NULL`
  ).catch(() => []);

  if (rows.length === 0) {
    console.log("No legacy chatHistory blobs found (column may already be dropped). Skipping.");
    return;
  }

  let totalMessages = 0;

  for (const row of rows) {
    let messages: Array<{ id?: string; role?: string; createdAt?: string; [key: string]: unknown }>;
    try {
      messages = JSON.parse(row.chatHistory);
    } catch {
      console.warn(`Skipping ChatHistory ${row.id}: invalid JSON`);
      continue;
    }

    if (!Array.isArray(messages) || messages.length === 0) continue;

    const messageData = messages.map((msg, idx) => ({
      id: msg.id && msg.id !== "" ? msg.id : randomUUID(),
      chatHistoryId: row.id,
      role: msg.role ?? "user",
      content: JSON.stringify(msg),
      order: idx,
      createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
    }));

    await prisma.message.createMany({ data: messageData });
    totalMessages += messageData.length;
  }

  console.log(`Migrated ${totalMessages} messages across ${rows.length} chat histories.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Migration failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
