import { connect, JSONCodec } from "nats";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.js";
import { processMonitoringClosedEvent } from "../consumers/monitoring-events.consumer.js";

const [command,sequenceValue,reason,confirmation]=process.argv.slice(2);
let connection:Awaited<ReturnType<typeof connect>>|undefined;
const positive=z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
try {
  if(command!=="inspect"&&command!=="replay")throw new Error('Usage: npm run ops:closures -- inspect [fromSequence] | replay <streamSequence> "reason (10+ characters)" --confirm');
  connection=await connect({servers:env.NATS_URL,name:"exa-pool-closure-operator",timeout:5000});
  const manager=await connection.jetstreamManager();
  const info=await manager.streams.info(env.NATS_MONITORING_STREAM);
  if(command==="inspect") {
    const consumer=await manager.consumers.info(env.NATS_MONITORING_STREAM,env.NATS_MONITORING_CONSUMER).catch(()=>null);
    const from=sequenceValue?positive.parse(sequenceValue):Math.max(1,info.state.first_seq);
    const to=Math.min(info.state.last_seq,from+199);
    const unresolved:unknown[]=[];
    for(let sequence=from;sequence<=to;sequence++) {
      const stored=await manager.streams.getMessage(env.NATS_MONITORING_STREAM,{seq:sequence}).catch(error=>{if((error as {code?:string}).code==="404")return null;throw error;});
      if(!stored||stored.subject!=="monitoring.period.closed.v1")continue;
      let event:any;
      try {event=JSONCodec<any>().decode(stored.data);if(!event||typeof event!=="object")throw new Error("Invalid event object");}
      catch {unresolved.push({sequence,state:"INVALID_PAYLOAD"});continue;}
      if(typeof event.eventId!=="string"||!await prisma.processedEvent.findUnique({where:{eventId:event.eventId}}))
        unresolved.push({sequence,eventId:event.eventId??null,aggregateId:event.aggregateId??null,state:consumer&&sequence<=consumer.delivered.stream_seq?"DELIVERED_UNPROCESSED_CHECK_EXHAUSTION_LOGS":"NOT_PROCESSED"});
    }
    process.stdout.write(JSON.stringify({stream:env.NATS_MONITORING_STREAM,consumer,unresolved,nextSequence:to<info.state.last_seq?to+1:null},null,2)+"\n");
  } else {
    const sequence=positive.parse(sequenceValue);const explanation=z.string().trim().min(10).max(1000).parse(reason);
    if(confirmation!=="--confirm")throw new Error("Replay requires --confirm");
    const stored=await manager.streams.getMessage(env.NATS_MONITORING_STREAM,{seq:sequence});
    if(stored.subject!=="monitoring.period.closed.v1")throw new Error("Selected message is not a Monitoring closure");
    const result=await processMonitoringClosedEvent(JSONCodec().decode(stored.data),stored.subject);
    logger.warn({sequence,result,reason:explanation,operator:process.env.USERNAME??process.env.USER??"local-operator"},"Operator replayed closure through the idempotent handler");
  }
}catch(error){logger.error({error},"Closure operation failed");process.exitCode=1;}
finally{if(connection)await connection.close();await prisma.$disconnect();}
