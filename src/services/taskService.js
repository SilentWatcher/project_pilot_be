import { db } from '../config/db.js';
import AppError from '../utils/AppError.js';

const isOwner = (project, userId, userRole) => {
  if (userRole === 'admin') return true;
  return String(project.createdBy) === String(userId);
};

const createTask = async (projectId, data, userId) => {
  const project = await db.project.findFirst({
    where: { id: projectId, createdBy: userId },
  });

  if (!project) {
    throw new AppError('Project not found or unauthorized', 404);
  }

  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: 'pending',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      projectId,
      assignedTo: data.assignedTo || null,
    },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
  });

  return task;
};

const getTasks = async (projectId, query, userId) => {
  const project = await db.project.findFirst({
    where: { id: projectId, createdBy: userId },
  });

  if (!project) {
    throw new AppError('Project not found or unauthorized', 404);
  }

  const { status, priority, search, page = 1, limit = 10 } = query;
  const safeLimit = Math.min(Number(limit), 500);
  const skip = (page - 1) * safeLimit;

  const where = { projectId };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const [tasks, total] = await Promise.all([
    db.task.findMany({
      where,
      include: {
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    db.task.count({ where }),
  ]);

  return {
    tasks,
    pagination: {
      total,
      page: Number(page),
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const getAllTasks = async (query, userId) => {
  const { status, priority, search, projectId, exportAll, page = 1, limit = 10 } = query;

  const where = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    const matchingProjects = await db.project.findMany({
      where: { title: { contains: search, mode: 'insensitive' }, createdBy: userId },
      select: { id: true },
    });
    const projectIds = matchingProjects.map((p) => p.id);
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
    ];
  }

  const queryOpts = {
    where,
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  };

  if (!exportAll) {
    const safeLimit = Math.min(Number(limit), 500);
    queryOpts.skip = (Number(page) - 1) * safeLimit;
    queryOpts.take = safeLimit;
  }

  const [tasks, total] = await Promise.all([
    db.task.findMany(queryOpts),
    db.task.count({ where }),
  ]);

  if (exportAll) {
    return { tasks };
  }

  return {
    tasks,
    pagination: {
      total,
      page: Number(page),
      limit: Math.min(Number(limit), 500),
      totalPages: Math.ceil(total / Math.min(Number(limit), 500)),
    },
  };
};

const updateTask = async (taskId, data, userId, userRole) => {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!isOwner(task.project, userId, userRole) && userRole !== 'member') {
    throw new AppError('Unauthorized to update this task', 403);
  }

  const updateData = {};
  if (data.title) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority) updateData.priority = data.priority;
  if (data.status) updateData.status = data.status;
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

  const updated = await db.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
      project: {
        select: { id: true, title: true },
      },
    },
  });

  return updated;
};

const deleteTask = async (taskId, userId, userRole) => {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!isOwner(task.project, userId, userRole)) {
    throw new AppError('Unauthorized to delete this task', 403);
  }

  await db.task.delete({ where: { id: taskId } });

  return { id: taskId };
};

const updateTaskStatus = async (taskId, status, userId, userRole) => {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!isOwner(task.project, userId, userRole) && userRole !== 'member') {
    throw new AppError('Unauthorized to update this task', 403);
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: { status },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return updated;
};

export {
  createTask,
  getTasks,
  getAllTasks,
  updateTask,
  deleteTask,
  updateTaskStatus,
};
