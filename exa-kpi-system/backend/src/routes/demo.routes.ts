import { Router } from "express";
import { DemoController } from "../controllers/demo.controller.js";

const controller = new DemoController();

export const demoRoutes = Router();

demoRoutes.get("/", controller.getDemo);
demoRoutes.post("/", controller.createDemo);
