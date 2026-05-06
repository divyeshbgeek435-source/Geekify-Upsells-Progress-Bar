import { Router } from "express";

export function createCrudRouter(controller) {
  const router = Router();
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.updateById);
  router.put("/:id", controller.updateById);
  router.delete("/:id", controller.removeById);
  return router;
}
