import { beforeEach, describe, expect, it, vi } from "vitest";
import { natsManager } from "../config/nats.js";
import { OutboxProcessor } from "../outbox/outbox.processor.js";

const event = {
  id: 1n,
  eventId: "00000000-0000-4000-8000-000000000001",
  subject: "monitoring.period.closed.v1",
  payload: { eventId: "00000000-0000-4000-8000-000000000001" },
  attemptCount: 0,
};

describe("Monitoring Outbox processor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("leaves pending events untouched while NATS is unavailable", async () => {
    const repository = { claimPending: vi.fn(), markPublished: vi.fn(), markFailed: vi.fn() };
    vi.spyOn(natsManager, "jetStream", "get").mockReturnValue(undefined);
    await new OutboxProcessor(repository as never).processBatch();
    expect(repository.claimPending).not.toHaveBeenCalled();
  });

  it("marks a failed publish retryable and publishes it after NATS recovers", async () => {
    const repository = {
      claimPending: vi.fn().mockResolvedValue([event]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    };
    const publish = vi.fn().mockRejectedValueOnce(new Error("NATS down")).mockResolvedValueOnce({});
    vi.spyOn(natsManager, "jetStream", "get").mockReturnValue({ publish } as never);
    const processor = new OutboxProcessor(repository as never);

    await processor.processBatch();
    expect(repository.markFailed).toHaveBeenCalledWith(1n, expect.any(Error), 0, expect.any(Number));
    expect(repository.markPublished).not.toHaveBeenCalled();

    await processor.processBatch();
    expect(publish).toHaveBeenLastCalledWith(event.subject, expect.any(Uint8Array), { msgID: event.eventId });
    expect(repository.markPublished).toHaveBeenCalledWith(1n);
  });
});
