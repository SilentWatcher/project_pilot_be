import { db } from '../config/db.js';
import AppError from '../utils/AppError.js';

const isOwner = (project, userId, userRole) => {
  if (userRole === 'admin') return true;
  return String(project.createdBy) === String(userId);
};

const createProject = async (data, userId) => {
  const project = await db.project.create({
    data: {
      title: data.title,
      description: data.description,
      deadline: new Date(data.deadline),
      status: data.status || 'active',
      createdBy: userId,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return project;
};

const getProjects = async (query, userId) => {
  const { search, status, page = 1, limit = 9 } = query;
  const safeLimit = Math.min(Number(limit), 500);
  const skip = (page - 1) * safeLimit;

  const where = { createdBy: userId };

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  if (status) {
    where.status = status;
  }

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    db.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const getProjectById = async (projectId, userId, userRole) => {
  const where = userRole === 'admin' ? { id: projectId } : { id: projectId, createdBy: userId };

  const project = await db.project.findFirst({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      tasks: {
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  return project;
};

const updateProject = async (projectId, data, userId, userRole) => {
  const where = userRole === 'admin' ? { id: projectId } : { id: projectId, createdBy: userId };

  const project = await db.project.findFirst({ where });

  if (!project) {
    throw new AppError('Project not found or unauthorized', 404);
  }

  const updateData = {};
  if (data.title) updateData.title = data.title;
  if (data.description) updateData.description = data.description;
  if (data.deadline) updateData.deadline = new Date(data.deadline);
  if (data.status) updateData.status = data.status;

  const updated = await db.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      _count: { select: { tasks: true } },
    },
  });

  return updated;
};

const deleteProject = async (projectId, userId, userRole) => {
  const where = userRole === 'admin' ? { id: projectId } : { id: projectId, createdBy: userId };

  const project = await db.project.findFirst({ where });

  if (!project) {
    throw new AppError('Project not found or unauthorized', 404);
  }

  await db.task.deleteMany({ where: { projectId } });
  await db.project.delete({ where: { id: projectId } });

  return { id: projectId };
};

export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
