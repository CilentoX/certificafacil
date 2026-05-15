import { listProjects, getProject, saveProject, deleteProject, duplicateProject } from "../controllers/projects.js";

/**
 * Project Routes - Authenticated
 */
export default async function projectRoutes(fastify, options) {
  // Authentication middleware for all projects routes
  fastify.addHook("preValidation", fastify.authenticate);

  fastify.get("/", listProjects);
  fastify.get("/:uid", getProject);
  fastify.post("/", saveProject);
  fastify.post("/:uid/duplicate", duplicateProject);
  fastify.delete("/:uid", deleteProject);
}
