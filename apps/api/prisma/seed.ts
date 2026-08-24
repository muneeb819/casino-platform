import "dotenv/config";
import "reflect-metadata";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../src/common/prisma.service";
import { WalletService } from "../src/modules/wallet/wallet.service";
import { CATALOG } from "../src/modules/games/catalog.data";

async function main() {
  const prisma = new PrismaService();
  const wallet = new WalletService(prisma);

  for (const item of CATALOG) {
    await prisma.game.upsert({
      where: {
        providerCode_providerGameId: {
          providerCode: item.providerCode,
          providerGameId: item.providerGameId,
        },
      },
      create: item,
      update: { name: item.name, category: item.category, thumbnail: item.thumbnail, rtp: item.rtp },
    });
  }
  console.log(`Catalog ensured: ${CATALOG.length} games`);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      passwordHash: await bcrypt.hash("Admin1234!", 10),
      role: "ADMIN",
      kycStatus: "VERIFIED",
    },
  });

  const makePlayer = async (email: string, password: string, depositCents: number) => {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          kycStatus: "PENDING",
        },
      });
      await prisma.kycDocument.create({
        data: { userId: user.id, docType: "ID_CARD", fileRef: `seed://${email}/id.jpg`, status: "PENDING" },
      });
    }
    const acc = await prisma.account.findFirst({ where: { userId: user.id, kind: "REAL" } });
    if (!acc || acc.balanceCents === 0) {
      await wallet.deposit(user.id, depositCents, `seed_${email}`, { psp: "seed" });
    }
    return user;
  };

  const player = await makePlayer("demo@demo.local", "Player1234!", 20000);
  await makePlayer("whale@demo.local", "Player1234!", 250000);

  console.log("Seeded:");
  console.log(`  admin : admin@demo.local / Admin1234! (${admin.id})`);
  console.log(`  player: demo@demo.local / Player1234!`);
  console.log(`  whale : whale@demo.local / Player1234!`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
