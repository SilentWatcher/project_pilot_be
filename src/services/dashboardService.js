import { db } from '../config/db.js';

const getStats = async (userId) => {
  const now = new Date();

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    recentProjects,
  ] = await Promise.all([
    db.project.count({ where: { createdBy: userId } }),
    db.project.count({ where: { createdBy: userId, status: 'active' } }),
    db.project.count({ where: { createdBy: userId, status: 'completed' } }),
    db.task.count({ where: { project: { createdBy: userId } } }),
    db.task.count({ where: { project: { createdBy: userId }, status: 'pending' } }),
    db.task.count({ where: { project: { createdBy: userId }, status: 'in-progress' } }),
    db.task.count({ where: { project: { createdBy: userId }, status: 'completed' } }),
    db.task.count({
      where: {
        project: { createdBy: userId },
        dueDate: { lt: now },
        status: { not: 'completed' },
      },
    }),
    db.project.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
    }),
  ]);

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    recentProjects,
  };
};

const getCharts = async (userId) => {
  const tasksByStatus = await db.task.groupBy({
    by: ['status'],
    where: { project: { createdBy: userId } },
    _count: { status: true },
  });

  const projectsByStatus = await db.project.groupBy({
    by: ['status'],
    where: { createdBy: userId },
    _count: { status: true },
  });

  const tasksByPriority = await db.task.groupBy({
    by: ['priority'],
    where: { project: { createdBy: userId } },
    _count: { priority: true },
  });

  const allStatuses = ['pending', 'in-progress', 'completed'];
  const allPriorities = ['low', 'medium', 'high'];
  const allProjectStatuses = ['active', 'completed', 'archived'];

  const formatChartData = (data, groupField, allValues) => {
    const map = {};
    data.forEach((item) => {
      map[item[groupField]] = item._count[groupField];
    });
    return allValues.map((value) => ({
      name: value.charAt(0).toUpperCase() + value.slice(1),
      value: map[value] || 0,
      fill: getColor(value),
    }));
  };

  return {
    tasksByStatus: formatChartData(tasksByStatus, 'status', allStatuses),
    projectsByStatus: formatChartData(projectsByStatus, 'status', allProjectStatuses),
    tasksByPriority: formatChartData(tasksByPriority, 'priority', allPriorities),
  };
};

function getColor(value) {
  const colors = {
    pending: '#F59E0B',
    'in-progress': '#38BDF8',
    completed: '#22C55E',
    active: '#38BDF8',
    archived: '#64748B',
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
  };
  return colors[value] || '#38BDF8';
}

export { getStats, getCharts };
