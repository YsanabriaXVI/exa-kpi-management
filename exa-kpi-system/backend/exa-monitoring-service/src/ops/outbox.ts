import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";

// Local operator command; no new unauthenticated administration HTTP surface.
const [command,eventId,reason,confirmation]=process.argv.slice(2);
try {
  if(command==="list") {
    const rows=await prisma.outboxEvent.findMany({where:{status:"DEAD"},orderBy:{occurredAt:"asc"},take:100,
      select:{eventId:true,subject:true,aggregateId:true,attemptCount:true,lastError:true,occurredAt:true}});
    process.stdout.write(JSON.stringify(rows,null,2)+"\n");
  } else if(command==="replay"&&confirmation==="--confirm") {
    const id=z.string().uuid().parse(eventId);const explanation=z.string().trim().min(10).max(1000).parse(reason);
    const changed=await prisma.outboxEvent.updateMany({where:{eventId:id,status:"DEAD"},data:{status:"PENDING",attemptCount:0,nextAttemptAt:new Date(),lockedAt:null,lockedBy:null}});
    if(changed.count!==1)throw new Error("Event not found or not DEAD; nothing replayed");
    logger.warn({eventId:id,reason:explanation,operator:process.env.USERNAME??process.env.USER??"local-operator"},"Operator requeued DEAD Outbox event");
  } else throw new Error('Usage: npm run ops:outbox -- list | replay <eventId> "reason (10+ characters)" --confirm');
} catch(error) {logger.error({error},"Outbox operation failed");process.exitCode=1;}
finally {await prisma.$disconnect();}
