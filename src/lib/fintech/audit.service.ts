import type { AuditEventType, FinancialAuditEvent } from "@/types/fintech";
import { getFintechStore } from "@/lib/fintech/fintech-store";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class FinancialAuditService {
  async record(input: {
    type: AuditEventType;
    actor: string;
    targetCollection: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<FinancialAuditEvent> {
    return getFintechStore().createAuditEvent({
      id: createId("audit"),
      createdAt: new Date().toISOString(),
      type: input.type,
      actor: input.actor,
      targetCollection: input.targetCollection,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    });
  }
}
