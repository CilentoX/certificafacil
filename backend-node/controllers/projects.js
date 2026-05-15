import prisma from "../db.js";

/**
 * List all projects for the authenticated user
 */
export async function listProjects(request, reply) {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: request.user.id },
      orderBy: { updatedAt: "desc" },
    });
    return projects;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Erro ao listar projetos" });
  }
}

/**
 * Get a specific project by UID
 */
export async function getProject(request, reply) {
  try {
    const { uid } = request.params;
    const project = await prisma.project.findFirst({
      where: { uid, userId: request.user.id },
    });

    if (!project) {
      return reply.code(404).send({ error: "Projeto não encontrado" });
    }

    return project;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Erro ao carregar projeto" });
  }
}

/**
 * Create or Update a project (Upsert)
 */
export async function saveProject(request, reply) {
  try {
    const { uid, name, templateName, configJson } = request.body;

    if (uid) {
      // Update existing project verifying ownership
      const existingProject = await prisma.project.findFirst({
        where: { uid, userId: request.user.id }
      });

      if (!existingProject) {
        return reply.code(404).send({ error: "Projeto não encontrado ou acesso restrito" });
      }

      const project = await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          name: name || existingProject.name,
          templateName: templateName !== undefined ? templateName : existingProject.templateName,
          configJson: configJson !== undefined ? configJson : existingProject.configJson
        }
      });
      
      return project;
    } else {
      // Create - Check Plan Limits
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        include: { plan: true },
      });

      const projectCount = await prisma.project.count({
        where: { userId: request.user.id },
      });

      if (user.plan.maxTemplates !== 0 && projectCount >= user.plan.maxTemplates) {
        return reply.code(403).send({ 
          error: `Limite de projetos atingido para o seu plano (${user.plan.name}). Por favor, faça um upgrade.` 
        });
      }

      // Create
      const project = await prisma.project.create({
        data: {
          userId: request.user.id,
          name: name || "Projeto Sem Título",
          templateName,
          configJson,
        },
      });
      return project;
    }
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Erro ao salvar projeto" });
  }
}

/**
 * Delete a project
 */
export async function deleteProject(request, reply) {
  try {
    const { uid } = request.params;
    await prisma.project.delete({
      where: { uid, userId: request.user.id },
    });

    await prisma.activityLog.create({
      data: {
        userId: request.user.id,
        action: 'PROJECT_DELETED',
        details: { uid }
      }
    });

    return { success: true, message: "Projeto excluído" };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Erro ao excluir projeto" });
  }
}

/**
 * Duplicate a project
 */
export async function duplicateProject(request, reply) {
  try {
    const { uid } = request.params;
    
    // Get existing project
    const existingProject = await prisma.project.findFirst({
      where: { uid, userId: request.user.id }
    });

    if (!existingProject) {
      return reply.code(404).send({ error: "Projeto não encontrado" });
    }

    // Check Plan Limits
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { plan: true },
    });

    const projectCount = await prisma.project.count({
      where: { userId: request.user.id },
    });

    if (user.plan.maxTemplates !== 0 && projectCount >= user.plan.maxTemplates) {
      return reply.code(403).send({ 
        error: `Limite de projetos atingido para o seu plano (${user.plan.name}). Por favor, faça um upgrade.` 
      });
    }

    // Duplicate
    const duplicatedProject = await prisma.project.create({
      data: {
        userId: request.user.id,
        name: `${existingProject.name} (Cópia)`,
        templateName: existingProject.templateName,
        configJson: existingProject.configJson,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: request.user.id,
        action: 'PROJECT_DUPLICATED',
        details: { sourceUid: uid, newUid: duplicatedProject.uid }
      }
    });

    return duplicatedProject;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Erro ao duplicar projeto" });
  }
}
