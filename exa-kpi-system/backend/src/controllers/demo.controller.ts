import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { createDemoSchema } from "../schemas/demo.schema.js";

const modules = [
  "KPI Management",
  "Pool KPIs",
  "Scorecards",
  "Monitoring Results",
  "Reports",
  "Roles/Users",
];

export class DemoController {
  getDemo = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        message: "EXA KPI demo route is working",
        data: { modules },
      });
    } catch (error) {
      next(error);
    }
  };

  createDemo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = createDemoSchema.parse(req.body);

      res.status(201).json({
        success: true,
        message: "Demo payload received",
        data: {
          id: randomUUID(),
          ...dto,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
