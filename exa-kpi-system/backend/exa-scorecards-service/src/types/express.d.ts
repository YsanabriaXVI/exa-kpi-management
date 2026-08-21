declare global {
  namespace Express { interface Request { identity: { actorUserId: bigint } } }
}
export {};
