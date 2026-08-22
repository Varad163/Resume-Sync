/**
 * Spend accounting for one scan.
 *
 * A scan runs unattended against an estate of unknown size, so the ceiling is
 * enforced here rather than hoped for. When the budget is exhausted the campaign
 * does not fail — it stops asking the model and falls through to deterministic
 * handling, which is degraded but honest, and says so in the report.
 */

import { costCents, type ModelUsage } from "./client.js";

export class BudgetExhausted extends Error {
  constructor(readonly spentCents: number, readonly limitCents: number) {
    super(`model budget exhausted: ${spentCents.toFixed(2)}c of ${limitCents}c`);
    this.name = "BudgetExhausted";
  }
}

export class Budget {
  #inputTokens = 0;
  #outputTokens = 0;
  #cents = 0;

  constructor(private readonly limitCents: number) {}

  record(model: string, usage: ModelUsage): void {
    this.#inputTokens += usage.inputTokens;
    this.#outputTokens += usage.outputTokens;
    this.#cents += costCents(model, usage);
  }

  get inputTokens(): number {
    return this.#inputTokens;
  }

  get outputTokens(): number {
    return this.#outputTokens;
  }

  get spentCents(): number {
    return this.#cents;
  }

  get remainingCents(): number {
    return Math.max(0, this.limitCents - this.#cents);
  }

  /** True while there is enough headroom to be worth another call. */
  canSpend(estimateCents = 1): boolean {
    return this.#cents + estimateCents <= this.limitCents;
  }

  assertCanSpend(estimateCents = 1): void {
    if (!this.canSpend(estimateCents)) {
      throw new BudgetExhausted(this.#cents, this.limitCents);
    }
  }
}
