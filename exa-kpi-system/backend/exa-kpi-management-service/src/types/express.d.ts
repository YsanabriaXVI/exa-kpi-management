declare global {
  namespace Express {
    interface Request {
      identity: {
        actorUserId: bigint | null;
        source: "temporary-environment";
      };
    }
  }
}

export {};
