import { beforeEach, describe, expect, it, vi } from "vitest";
import { natsManager } from "../config/nats.js";
import { OutboxProcessor } from "../outbox/outbox.processor.js";

const event = {
  id: 1n, eventId: "00000000-0000-4000-8000-000000000001", subject: "kpi.pool.activated.v1",
  payload: { eventId: "00000000-0000-4000-8000-000000000001" }, attemptCount: 0,
};

describe("Outbox processor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("publishes a claimed event with JetStream deduplication and marks it published", async () => {
    const repository = { claimPending: vi.fn().mockResolvedValue([event]), markPublished: vi.fn(), markFailed: vi.fn() };
    const publish = vi.fn().mockResolvedValue({});
    vi.spyOn(natsManager, "jetStream", "get").mockReturnValue({ publish } as never);
    await new OutboxProcessor(repository as never).processBatch();
    expect(publish).toHaveBeenCalledWith(event.subject, expect.any(Uint8Array), { msgID: event.eventId });
    expect(repository.markPublished).toHaveBeenCalledWith(1n);
  });

  it("keeps a failed publish retryable through the repository policy", async () => {
    const repository = { claimPending: vi.fn().mockResolvedValue([event]), markPublished: vi.fn(), markFailed: vi.fn() };
    vi.spyOn(natsManager, "jetStream", "get").mockReturnValue({ publish: vi.fn().mockRejectedValue(new Error("NATS down")) } as never);
    await new OutboxProcessor(repository as never).processBatch();
    expect(repository.markFailed).toHaveBeenCalledWith(1n, expect.any(Error), 0, expect.any(Number));
    expect(repository.markPublished).not.toHaveBeenCalled();
  });
});
