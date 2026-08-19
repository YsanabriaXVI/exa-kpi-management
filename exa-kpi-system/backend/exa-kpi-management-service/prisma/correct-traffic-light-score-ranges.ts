import { prisma } from "../src/config/database/prisma.js";

export async function correctTrafficLightScoreRanges() {
  const revisions = await prisma.kpiConfigurationRevision.findMany({
    where: {
      thresholds: {
        some: {
          trafficLightLevel: { code: "GREEN" },
          rangeMinPercent: 0,
        },
      },
    },
    select: {
      id: true,
      configuration: { select: { configCode: true } },
      thresholds: {
        include: { trafficLightLevel: { select: { code: true } } },
      },
    },
  });

  const affected = revisions.filter((revision) => {
    const red = revision.thresholds.find((threshold) => threshold.trafficLightLevel.code === "RED");
    return Number(red?.rangeMaxPercent) === 100;
  });

  await prisma.$transaction(async (transaction) => {
    for (const revision of affected) {
      const bands = revision.thresholds
        .map((threshold) => ({ min: threshold.rangeMinPercent, max: threshold.rangeMaxPercent }))
        .sort((left, right) => Number(left.min) - Number(right.min));
      const codes = ["RED", "YELLOW", "GREEN"] as const;
      for (const [index, code] of codes.entries()) {
        const threshold = revision.thresholds.find((item) => item.trafficLightLevel.code === code);
        const band = bands[index];
        if (!threshold || !band) throw new Error(`Incomplete Traffic Light revision ${revision.id}`);
        await transaction.kpiConfigurationRevisionThreshold.update({
          where: { id: threshold.id },
          data: {
            rangeMinPercent: band.min,
            rangeMaxPercent: band.max,
            displayOrder: index + 1,
          },
        });
      }
    }
  });

  return { correctedRevisions: affected.length, configurationCodes: affected.map((item) => item.configuration.configCode) };
}

const isDirectExecution = process.argv[1]?.replace(/\\/g, "/").endsWith("/correct-traffic-light-score-ranges.ts");
if (isDirectExecution) {
  correctTrafficLightScoreRanges()
    .then((result) => console.info("Traffic Light score ranges corrected", result))
    .finally(() => prisma.$disconnect());
}
