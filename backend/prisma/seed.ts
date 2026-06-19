import { PrismaClient, Category } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Matches the salt rounds used by the backend's auth.service.ts (bcrypt.hash(pw, 12)).
const SALT_ROUNDS = 12;
const DEMO_PASSWORD = 'Demo1234!';

// Rounds money to 2 decimals to avoid floating point artifacts in amounts/splits.
function money(value: number): number {
  return Math.round(value * 100) / 100;
}

// Returns a Date `daysAgo` days before now (with optional hour offset for variety).
function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // --- Reset: delete in FK-safe order (children first) ---
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // --- Users (5) ---
  const usersData = [
    { email: 'marc@demo.com', name: 'Marc Demo' },
    { email: 'laura@demo.com', name: 'Laura Sánchez' },
    { email: 'raul@demo.com', name: 'Raul Martínez' },
    { email: 'ana@demo.com', name: 'Ana García' },
    { email: 'shanks@demo.com', name: 'Shanks' },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        password: passwordHash,
      },
    });
    users[u.email] = created;
  }

  const marc = users['marc@demo.com'];
  const laura = users['laura@demo.com'];
  const raul = users['raul@demo.com'];
  const ana = users['ana@demo.com'];
  const shanks = users['shanks@demo.com'];

  // --- Groups (3) with members ---
  // role values match the backend (groups.service.ts uses 'admin' / 'member').
  const barcelona = await prisma.group.create({
    data: {
      name: 'Viaje a Barcelona 2026',
      description: 'Escapada de fin de semana a Barcelona con el grupo.',
      members: {
        create: [
          { userId: marc.id, role: 'admin' },
          { userId: laura.id, role: 'member' },
          { userId: raul.id, role: 'member' },
          { userId: ana.id, role: 'member' },
        ],
      },
    },
  });

  const dinner = await prisma.group.create({
    data: {
      name: 'Cena de los viernes',
      description: 'Las cenas semanales de los viernes.',
      members: {
        create: [
          { userId: marc.id, role: 'admin' },
          { userId: laura.id, role: 'member' },
          { userId: shanks.id, role: 'member' },
        ],
      },
    },
  });

  const apartment = await prisma.group.create({
    data: {
      name: 'Piso compartido',
      description: 'Gastos comunes del piso compartido.',
      members: {
        create: [
          { userId: marc.id, role: 'admin' },
          { userId: raul.id, role: 'member' },
          { userId: ana.id, role: 'member' },
        ],
      },
    },
  });

  // Member id lists per group (used to build equal-share splits).
  const barcelonaMembers = [marc.id, laura.id, raul.id, ana.id];
  const dinnerMembers = [marc.id, laura.id, shanks.id];
  const apartmentMembers = [marc.id, raul.id, ana.id];

  // --- Expenses ---
  type ExpenseSeed = {
    description: string;
    amount: number;
    currency: string;
    category: Category;
    date: Date;
    groupId: string;
    paidById: string;
    members: string[];
  };

  const expenses: ExpenseSeed[] = [
    // ===== Viaje a Barcelona 2026 (8) =====
    {
      description: 'Hotel Generator Barcelona (2 noches)',
      amount: 384.5,
      currency: 'EUR',
      category: Category.accommodation,
      date: daysAgo(118, 15),
      groupId: barcelona.id,
      paidById: marc.id,
      members: barcelonaMembers,
    },
    {
      description: 'Billetes de tren a Barcelona',
      amount: 213.8,
      currency: 'EUR',
      category: Category.transport,
      date: daysAgo(119, 9),
      groupId: barcelona.id,
      paidById: laura.id,
      members: barcelonaMembers,
    },
    {
      description: 'Entradas Sagrada Familia',
      amount: 104.0,
      currency: 'EUR',
      category: Category.entertainment,
      date: daysAgo(117, 11),
      groupId: barcelona.id,
      paidById: raul.id,
      members: barcelonaMembers,
    },
    {
      description: 'Cena en El Nacional',
      amount: 162.35,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(117, 21),
      groupId: barcelona.id,
      paidById: ana.id,
      members: barcelonaMembers,
    },
    {
      description: 'Taxi al aeropuerto',
      amount: 38.7,
      currency: 'EUR',
      category: Category.transport,
      date: daysAgo(116, 7),
      groupId: barcelona.id,
      paidById: marc.id,
      members: barcelonaMembers,
    },
    {
      description: 'Uber desde el Born',
      amount: 14.25,
      currency: 'EUR',
      category: Category.transport,
      date: daysAgo(116, 23),
      groupId: barcelona.id,
      paidById: laura.id,
      members: barcelonaMembers,
    },
    {
      description: 'Souvenirs en Las Ramblas',
      amount: 67.9,
      currency: 'USD',
      category: Category.shopping,
      date: daysAgo(116, 18),
      groupId: barcelona.id,
      paidById: ana.id,
      members: barcelonaMembers,
    },
    {
      description: 'Farmacia ibuprofeno y tiritas',
      amount: 12.4,
      currency: 'EUR',
      category: Category.health,
      date: daysAgo(115, 10),
      groupId: barcelona.id,
      paidById: raul.id,
      members: barcelonaMembers,
    },

    // ===== Cena de los viernes (8) =====
    {
      description: 'Cervezas La Cibeles',
      amount: 28.6,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(96, 22),
      groupId: dinner.id,
      paidById: marc.id,
      members: dinnerMembers,
    },
    {
      description: 'Pizza en Grosso Napoletano',
      amount: 54.3,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(82, 21),
      groupId: dinner.id,
      paidById: shanks.id,
      members: dinnerMembers,
    },
    {
      description: 'Entradas al cine',
      amount: 33.0,
      currency: 'EUR',
      category: Category.entertainment,
      date: daysAgo(75, 20),
      groupId: dinner.id,
      paidById: laura.id,
      members: dinnerMembers,
    },
    {
      description: 'Sushi para llevar',
      amount: 71.15,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(61, 21),
      groupId: dinner.id,
      paidById: marc.id,
      members: dinnerMembers,
    },
    {
      description: 'Taxi de vuelta a casa',
      amount: 18.9,
      currency: 'EUR',
      category: Category.transport,
      date: daysAgo(61, 23),
      groupId: dinner.id,
      paidById: laura.id,
      members: dinnerMembers,
    },
    {
      description: 'Pub night en Londres',
      amount: 49.5,
      currency: 'GBP',
      category: Category.entertainment,
      date: daysAgo(40, 23),
      groupId: dinner.id,
      paidById: shanks.id,
      members: dinnerMembers,
    },
    {
      description: 'Hamburguesas Goiko',
      amount: 62.8,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(26, 21),
      groupId: dinner.id,
      paidById: marc.id,
      members: dinnerMembers,
    },
    {
      description: 'Helados de postre',
      amount: 9.75,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(12, 20),
      groupId: dinner.id,
      paidById: laura.id,
      members: dinnerMembers,
    },

    // ===== Piso compartido (9) =====
    {
      description: 'Mercadona compra semanal',
      amount: 87.45,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(110, 12),
      groupId: apartment.id,
      paidById: marc.id,
      members: apartmentMembers,
    },
    {
      description: 'Factura de la luz (Iberdrola)',
      amount: 142.6,
      currency: 'EUR',
      category: Category.other,
      date: daysAgo(98, 9),
      groupId: apartment.id,
      paidById: raul.id,
      members: apartmentMembers,
    },
    {
      description: 'Netflix mayo',
      amount: 17.99,
      currency: 'EUR',
      category: Category.entertainment,
      date: daysAgo(85, 8),
      groupId: apartment.id,
      paidById: ana.id,
      members: apartmentMembers,
    },
    {
      description: 'Productos de limpieza',
      amount: 34.2,
      currency: 'EUR',
      category: Category.shopping,
      date: daysAgo(72, 17),
      groupId: apartment.id,
      paidById: marc.id,
      members: apartmentMembers,
    },
    {
      description: 'Factura del agua',
      amount: 56.3,
      currency: 'EUR',
      category: Category.other,
      date: daysAgo(58, 10),
      groupId: apartment.id,
      paidById: raul.id,
      members: apartmentMembers,
    },
    {
      description: 'Lámpara nueva para el salón',
      amount: 45.99,
      currency: 'USD',
      category: Category.shopping,
      date: daysAgo(44, 16),
      groupId: apartment.id,
      paidById: ana.id,
      members: apartmentMembers,
    },
    {
      description: 'Mercadona compra semanal',
      amount: 93.7,
      currency: 'EUR',
      category: Category.food,
      date: daysAgo(30, 13),
      groupId: apartment.id,
      paidById: raul.id,
      members: apartmentMembers,
    },
    {
      description: 'Internet y fibra (mensual)',
      amount: 39.95,
      currency: 'EUR',
      category: Category.other,
      date: daysAgo(15, 9),
      groupId: apartment.id,
      paidById: marc.id,
      members: apartmentMembers,
    },
    {
      description: 'Farmacia botiquín común',
      amount: 23.4,
      currency: 'EUR',
      category: Category.health,
      date: daysAgo(5, 18),
      groupId: apartment.id,
      paidById: ana.id,
      members: apartmentMembers,
    },
  ];

  let splitCount = 0;

  for (const e of expenses) {
    // Equal split: divide the amount across all members, fixing rounding on the last share.
    const n = e.members.length;
    const baseShare = money(e.amount / n);
    const shares = e.members.map((_, i) =>
      i === n - 1 ? money(e.amount - baseShare * (n - 1)) : baseShare,
    );

    await prisma.expense.create({
      data: {
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        category: e.category,
        date: e.date,
        groupId: e.groupId,
        paidById: e.paidById,
        splits: {
          create: e.members.map((userId, i) => ({
            userId,
            amount: shares[i],
          })),
        },
      },
    });

    splitCount += n;
  }

  console.log('✅ Seed completado:');
  console.log(`   - ${usersData.length} usuarios creados`);
  console.log('   - 3 grupos creados');
  console.log(`   - ${expenses.length} gastos creados`);
  console.log(`   - ${splitCount} splits creados`);
  console.log('');
  console.log('🔑 Acceso demo:');
  console.log('   Email: marc@demo.com');
  console.log('   Password: Demo1234!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
