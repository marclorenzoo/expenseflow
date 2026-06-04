export interface ExpenseForSettlement {
  paidBy: { id: string; name: string };
  splits: Array<{
    userId: string;
    amount: number;
    user: { id: string; name: string };
  }>;
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export function computeSettlements(
  expenses: ExpenseForSettlement[],
): Settlement[] {
  const debt: Record<string, Record<string, number>> = {};
  const names: Record<string, string> = {};

  for (const expense of expenses) {
    const payerId = expense.paidBy.id;
    names[payerId] = expense.paidBy.name;

    for (const split of expense.splits) {
      if (split.userId === payerId) continue;
      names[split.userId] = split.user.name;

      debt[split.userId] ??= {};
      debt[split.userId][payerId] =
        (debt[split.userId][payerId] ?? 0) + split.amount;
    }
  }

  const settlements: Settlement[] = [];
  const seen = new Set<string>();

  for (const fromId of Object.keys(debt)) {
    for (const toId of Object.keys(debt[fromId])) {
      const key = [fromId, toId].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const ab = debt[fromId]?.[toId] ?? 0;
      const ba = debt[toId]?.[fromId] ?? 0;
      const net = Math.round((ab - ba) * 100) / 100;

      if (net > 0.005) {
        settlements.push({
          fromId,
          fromName: names[fromId],
          toId,
          toName: names[toId],
          amount: net,
        });
      } else if (net < -0.005) {
        settlements.push({
          fromId: toId,
          fromName: names[toId],
          toId: fromId,
          toName: names[fromId],
          amount: -net,
        });
      }
    }
  }

  return settlements;
}
