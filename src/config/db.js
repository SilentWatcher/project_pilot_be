import crypto from 'crypto';
import mongoose from 'mongoose';
import config from './env.js';
import { User, Project, Task } from '../models/index.js';

const genId = () => crypto.randomBytes(12).toString('hex');

const store = {
  users: [],
  projects: [],
  tasks: [],
};

function findById(arr, id) {
  return arr.find(item => item.id === id) || null;
}

function isConnected() {
  return config.databaseUrl && mongoose.connection.readyState === 1;
}

function translateWhere(where) {
  if (!where) return {};
  const mongoWhere = {};
  let projectFilter = null;

  for (const [key, value] of Object.entries(where)) {
    if (key === 'id') {
      mongoWhere._id = value;
    } else if (key === 'createdBy') {
      mongoWhere.createdBy = value;
    } else if (key === 'projectId') {
      if (value && typeof value === 'object' && value.in) {
        mongoWhere.projectId = { $in: value.in };
      } else {
        mongoWhere.projectId = value;
      }
    } else if (key === 'assignedTo') {
      mongoWhere.assignedTo = value;
    } else if (key === 'title' && value && typeof value === 'object' && value.contains) {
      mongoWhere.title = { $regex: value.contains, $options: 'i' };
    } else if (key === 'dueDate' && value && typeof value === 'object' && value.lt) {
      mongoWhere.dueDate = { $lt: value.lt };
    } else if (key === 'status' && value && typeof value === 'object' && value.not) {
      mongoWhere.status = { $ne: value.not };
    } else if (key === 'project' && value && typeof value === 'object' && value.createdBy) {
      projectFilter = value.createdBy;
    } else if (key === 'OR' && Array.isArray(value)) {
      mongoWhere.$or = value.map(sub => translateWhere(sub).mongoWhere);
    } else {
      mongoWhere[key] = value;
    }
  }

  return { mongoWhere, projectFilter };
}

async function resolveProjectFilter(projectFilter) {
  const projects = await Project.find({ createdBy: projectFilter }).select('_id').lean();
  return { projectId: { $in: projects.map(p => p._id) } };
}

function applyInclude(query, include) {
  if (!include) return query;
  if (include.user) {
    const fields = include.user.select ? Object.keys(include.user.select).filter(k => k !== 'id').join(' ') : '';
    query = query.populate('createdBy', fields);
  }
  if (include.assignedUser) {
    const fields = include.assignedUser.select ? Object.keys(include.assignedUser.select).filter(k => k !== 'id').join(' ') : '';
    query = query.populate('assignedTo', fields);
  }
  if (include.project) {
    const fields = include.project.select ? Object.keys(include.project.select).filter(k => k !== 'id').join(' ') : '';
    query = query.populate('projectId', fields);
  }
  if (include.tasks) {
    let taskQuery = Task.find().populate('assignedTo', 'name email');
    if (include.tasks.include?.assignedUser?.select) {
      const af = Object.keys(include.tasks.include.assignedUser.select).filter(k => k !== 'id').join(' ');
      taskQuery = taskQuery.populate('assignedTo', af);
    }
    query._taskQuery = taskQuery;
  }
  return query;
}

async function attachCounts(docs, model, filterField) {
  const ids = docs.map(d => d._id);
  const counts = await model.aggregate([
    { $match: { [filterField]: { $in: ids } } },
    { $group: { _id: `$${filterField}`, count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach(c => { countMap[c._id.toString()] = c.count; });
  return docs.map(d => {
    d._count = { tasks: countMap[d._id.toString()] || 0 };
    return d;
  });
}

const db = {
  get connected() {
    return isConnected();
  },

  user: {
    findUnique: async ({ where }) => {
      if (isConnected()) {
        const user = await User.findOne(translateWhere(where).mongoWhere);
        return user ? user.toJSON() : null;
      }
      if (where.email) return store.users.find(u => u.email === where.email) || null;
      if (where.id) return findById(store.users, where.id);
      return null;
    },
    update: async ({ where, data, select }) => {
      if (isConnected()) {
        const user = await User.findByIdAndUpdate(
          where.id,
          { ...data, updatedAt: new Date() },
          { new: true }
        );
        if (!user) throw new Error('User not found');
        const json = user.toJSON();
        if (select) {
          const result = {};
          for (const key of Object.keys(select)) {
            if (key === 'id') result.id = json.id;
            else result[key] = json[key];
          }
          return result;
        }
        return json;
      }
      const idx = store.users.findIndex(u => u.id === where.id);
      if (idx === -1) throw new Error('User not found');
      store.users[idx] = { ...store.users[idx], ...data, updatedAt: new Date() };
      const result = { ...store.users[idx] };
      if (select) {
        const filtered = {};
        for (const key of Object.keys(select)) {
          filtered[key] = result[key];
        }
        return filtered;
      }
      return result;
    },
    create: async ({ data, select }) => {
      if (isConnected()) {
        const user = await User.create(data);
        const json = user.toJSON();
        if (select) {
          const result = {};
          for (const key of Object.keys(select)) {
            if (key === 'id') result.id = json.id;
            else result[key] = json[key];
          }
          return result;
        }
        return json;
      }
      const user = {
        id: genId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(user);
      if (select) {
        const result = {};
        for (const key of Object.keys(select)) {
          result[key] = user[key];
        }
        return result;
      }
      return user;
    },
  },

  project: {
    create: async ({ data, include }) => {
      if (isConnected()) {
        const projectData = { ...data };
        if (data.createdBy) projectData.createdBy = data.createdBy;
        const project = await Project.create(projectData);
        let json = project.toJSON();
        if (include?.user && data.createdBy) {
          const user = await User.findById(data.createdBy);
          json.createdBy = user ? { id: user.id, name: user.name, email: user.email } : null;
        }
        return json;
      }
      const project = {
        id: genId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
      };
      store.projects.push(project);
      if (include?.user && data.createdBy) {
        project.user = store.users.find(u => u.id === data.createdBy);
      }
      return project;
    },
    findMany: async ({ where, include, orderBy, skip, take, select }) => {
      if (isConnected()) {
        const { mongoWhere } = translateWhere(where);
        let query = Project.find(mongoWhere);
        if (orderBy?.createdAt === 'desc') query = query.sort({ createdAt: -1 });
        if (skip) query = query.skip(skip);
        if (take) query = query.limit(take);
        query = applyInclude(query, include);
        let projects = await query.lean();

        if (include?._count?.select?.tasks) {
          projects = await attachCounts(projects, Task, 'projectId');
        }

        for (const p of projects) {
          if (p.createdBy && typeof p.createdBy === 'object' && p.createdBy._bsontype === 'ObjectId') {
            p.createdBy = p.createdBy.toString();
          } else if (p.createdBy && typeof p.createdBy === 'object' && p.createdBy._id) {
            p.createdBy.id = p.createdBy._id.toString();
            delete p.createdBy._id;
          }
          p.id = p._id.toString();
          delete p._id;
          delete p.__v;
        }

        if (include?.tasks) {
          for (const p of projects) {
            let taskQuery = Task.find({ projectId: p.id }).populate('assignedTo', 'name email');
            if (include.tasks.include?.assignedUser?.select) {
              const af = Object.keys(include.tasks.include.assignedUser.select).filter(k => k !== 'id').join(' ');
              taskQuery = taskQuery.populate('assignedTo', af);
            }
            if (include.tasks.orderBy?.createdAt === 'desc') {
              taskQuery = taskQuery.sort({ createdAt: -1 });
            }
            const tasks = await taskQuery.lean();
            p.tasks = tasks.map(t => {
              if (t.assignedTo && typeof t.assignedTo === 'object') {
                t.assignedUser = { id: t.assignedTo._id.toString(), name: t.assignedTo.name, email: t.assignedTo.email };
              } else {
                t.assignedUser = null;
              }
              delete t.assignedTo;
              t.id = t._id.toString();
              delete t._id;
              delete t.__v;
              return t;
            });
          }
        }

        return projects;
      }
      let results = [...store.projects];
      if (where) {
        if (where.createdBy) results = results.filter(p => p.createdBy === where.createdBy);
        if (where.status) results = results.filter(p => p.status === where.status);
        if (where.title?.contains) {
          const q = where.title.contains.toLowerCase();
          results = results.filter(p => p.title.toLowerCase().includes(q));
        }
      }
      if (orderBy?.createdAt === 'desc') results.reverse();
      if (skip) results = results.slice(skip);
      if (take) results = results.slice(0, take);
      results = results.map(p => {
        const item = { ...p };
        if (include?.user && item.createdBy) {
          item.user = store.users.find(u => u.id === item.createdBy) || null;
        }
        if (include?._count?.select?.tasks) {
          item._count = { tasks: store.tasks.filter(t => t.projectId === item.id).length };
        }
        if (include?.tasks) {
          item.tasks = store.tasks
            .filter(t => t.projectId === item.id)
            .map(t => ({
              ...t,
              assignedUser: t.assignedTo ? store.users.find(u => u.id === t.assignedTo) || null : null,
            }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return item;
      });
      return results;
    },
    findFirst: async ({ where, include }) => {
      if (isConnected()) {
        const { mongoWhere } = translateWhere(where);
        let query = Project.findOne(mongoWhere);
        query = applyInclude(query, include);
        const project = await query.lean();
        if (!project) return null;

        if (project.createdBy && typeof project.createdBy === 'object' && project.createdBy._bsontype === 'ObjectId') {
          project.createdBy = project.createdBy.toString();
        } else if (project.createdBy && typeof project.createdBy === 'object' && project.createdBy._id) {
          project.createdBy.id = project.createdBy._id.toString();
          delete project.createdBy._id;
        }
        project.id = project._id.toString();
        delete project._id;
        delete project.__v;

        if (include?._count?.select?.tasks) {
          const count = await Task.countDocuments({ projectId: project.id });
          project._count = { tasks: count };
        }

        if (include?.tasks) {
          let taskQuery = Task.find({ projectId: project.id }).populate('assignedTo', 'name email');
          if (include.tasks.include?.assignedUser?.select) {
            const af = Object.keys(include.tasks.include.assignedUser.select).filter(k => k !== 'id').join(' ');
            taskQuery = taskQuery.populate('assignedTo', af);
          }
          if (include.tasks.orderBy?.createdAt === 'desc') {
            taskQuery = taskQuery.sort({ createdAt: -1 });
          }
          const tasks = await taskQuery.lean();
          project.tasks = tasks.map(t => {
            if (t.assignedTo && typeof t.assignedTo === 'object') {
              t.assignedUser = { id: t.assignedTo._id.toString(), name: t.assignedTo.name, email: t.assignedTo.email };
            } else {
              t.assignedUser = null;
            }
            delete t.assignedTo;
            t.id = t._id.toString();
            delete t._id;
            delete t.__v;
            return t;
          });
        }

        return project;
      }
      let item = null;
      if (where) {
        if (where.id && where.createdBy) {
          item = store.projects.find(p => p.id === where.id && p.createdBy === where.createdBy) || null;
        } else if (where.id) {
          item = findById(store.projects, where.id);
        }
      }
      if (!item) return null;
      const result = { ...item };
      if (include?.user && result.createdBy) {
        result.user = store.users.find(u => u.id === result.createdBy) || null;
      }
      if (include?._count?.select?.tasks) {
        result._count = { tasks: store.tasks.filter(t => t.projectId === result.id).length };
      }
      if (include?.tasks) {
        result.tasks = store.tasks
          .filter(t => t.projectId === result.id)
          .map(t => ({
            ...t,
            assignedUser: t.assignedTo ? store.users.find(u => u.id === t.assignedTo) || null : null,
          }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      return result;
    },
    count: async ({ where }) => {
      if (isConnected()) {
        const { mongoWhere } = translateWhere(where);
        return Project.countDocuments(mongoWhere);
      }
      let results = [...store.projects];
      if (where) {
        if (where.createdBy) results = results.filter(p => p.createdBy === where.createdBy);
        if (where.status) results = results.filter(p => p.status === where.status);
      }
      return results.length;
    },
    update: async ({ where, data, include }) => {
      if (isConnected()) {
        const project = await Project.findByIdAndUpdate(
          where.id,
          { ...data, updatedAt: new Date() },
          { new: true }
        ).lean();
        if (!project) throw new Error('Project not found');
        project.id = project._id.toString();
        delete project._id;
        delete project.__v;
        if (include?.user && project.createdBy) {
          const user = await User.findById(project.createdBy);
          project.createdBy = user ? { id: user.id, name: user.name, email: user.email } : null;
        }
        if (include?._count?.select?.tasks) {
          const count = await Task.countDocuments({ projectId: project.id });
          project._count = { tasks: count };
        }
        return project;
      }
      const idx = store.projects.findIndex(p => p.id === where.id);
      if (idx === -1) throw new Error('Project not found');
      store.projects[idx] = { ...store.projects[idx], ...data, updatedAt: new Date() };
      const result = { ...store.projects[idx] };
      if (include?.user && result.createdBy) {
        result.user = store.users.find(u => u.id === result.createdBy) || null;
      }
      if (include?._count?.select?.tasks) {
        result._count = { tasks: store.tasks.filter(t => t.projectId === result.id).length };
      }
      return result;
    },
    delete: async ({ where }) => {
      if (isConnected()) {
        await Project.deleteOne({ _id: where.id });
        return { id: where.id };
      }
      const idx = store.projects.findIndex(p => p.id === where.id);
      if (idx === -1) throw new Error('Project not found');
      store.projects.splice(idx, 1);
      return { id: where.id };
    },
    groupBy: async ({ by, where, _count }) => {
      if (isConnected()) {
        const { mongoWhere, projectFilter } = translateWhere(where);
        let finalWhere = mongoWhere;
        if (projectFilter) {
          const projFilter = await resolveProjectFilter(projectFilter);
          finalWhere = { ...mongoWhere, ...projFilter };
        }
        if (finalWhere.createdBy && typeof finalWhere.createdBy === 'string') {
          finalWhere.createdBy = new mongoose.Types.ObjectId(finalWhere.createdBy);
        }
        const results = await Project.aggregate([
          { $match: finalWhere },
          { $group: { _id: `$${by}`, count: { $sum: 1 } } },
        ]);
        return results.map(r => ({
          [by]: r._id,
          _count: { [by]: r.count },
        }));
      }
      let results = [...store.projects];
      if (where?.createdBy) results = results.filter(p => p.createdBy === where.createdBy);
      const grouped = {};
      results.forEach(item => {
        const key = item[by];
        if (!grouped[key]) grouped[key] = { [by]: key, _count: { [by]: 0 } };
        grouped[key]._count[by]++;
      });
      return Object.values(grouped);
    },
  },

  task: {
    create: async ({ data, include }) => {
      if (isConnected()) {
        const taskData = { ...data };
        if (data.projectId) taskData.projectId = data.projectId;
        if (data.assignedTo) taskData.assignedTo = data.assignedTo;
        const task = await Task.create(taskData);
        let json = task.toJSON();
        if (include?.assignedUser && task.assignedTo) {
          const user = await User.findById(task.assignedTo);
          json.assignedUser = user ? { id: user.id, name: user.name, email: user.email } : null;
        }
        if (include?.project) {
          const project = await Project.findById(task.projectId);
          json.project = project ? { id: project.id, title: project.title } : null;
        }
        return json;
      }
      const t = {
        id: genId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.tasks.push(t);
      if (include?.assignedUser && t.assignedTo) {
        t.assignedUser = store.users.find(u => u.id === t.assignedTo) || null;
      }
      if (include?.project) {
        t.project = store.projects.find(p => p.id === t.projectId) || null;
      }
      return t;
    },
    findMany: async ({ where, include, orderBy, skip, take }) => {
      if (isConnected()) {
        const { mongoWhere, projectFilter } = translateWhere(where);
        let finalWhere = mongoWhere;
        if (projectFilter) {
          const projFilter = await resolveProjectFilter(projectFilter);
          finalWhere = { ...mongoWhere, ...projFilter };
        }
        let query = Task.find(finalWhere);
        if (orderBy?.createdAt === 'desc') query = query.sort({ createdAt: -1 });
        if (skip) query = query.skip(skip);
        if (take) query = query.limit(take);
        query = applyInclude(query, include);
        const tasks = await query.lean();
        return tasks.map(t => {
          if (t.assignedTo && typeof t.assignedTo === 'object') {
            t.assignedUser = { id: t.assignedTo._id.toString(), name: t.assignedTo.name, email: t.assignedTo.email };
            delete t.assignedTo;
          }
          if (t.projectId && typeof t.projectId === 'object') {
            const proj = t.projectId;
            t.project = {
              id: proj._id.toString(),
              title: proj.title,
              createdBy: proj.createdBy ? (typeof proj.createdBy === 'object' ? proj.createdBy._bsontype === 'ObjectId' ? proj.createdBy.toString() : proj.createdBy._id?.toString() : proj.createdBy) : null,
            };
            delete t.projectId;
          }
          t.id = t._id.toString();
          delete t._id;
          delete t.__v;
          return t;
        });
      }
      let results = [...store.tasks];
      if (where) {
        if (where.projectId) results = results.filter(t => t.projectId === where.projectId);
        if (where.status) results = results.filter(t => t.status === where.status);
        if (where.priority) results = results.filter(t => t.priority === where.priority);
        if (where.project?.createdBy) {
          const projectIds = store.projects.filter(p => p.createdBy === where.project.createdBy).map(p => p.id);
          results = results.filter(t => projectIds.includes(t.projectId));
        }
        if (where.dueDate?.lt) {
          results = results.filter(t => t.dueDate && new Date(t.dueDate) < new Date(where.dueDate.lt));
        }
        if (where.status?.not) {
          results = results.filter(t => t.status !== where.status.not);
        }
        if (where.title?.contains) {
          const q = where.title.contains.toLowerCase();
          results = results.filter(t => t.title.toLowerCase().includes(q));
        }
      }
      if (orderBy?.createdAt === 'desc') results.reverse();
      const total = results.length;
      if (skip) results = results.slice(skip);
      if (take) results = results.slice(0, take);
      results = results.map(t => {
        const item = { ...t };
        if (include?.assignedUser && item.assignedTo) {
          item.assignedUser = store.users.find(u => u.id === item.assignedTo) || null;
        }
        if (include?.project) {
          const proj = store.projects.find(p => p.id === item.projectId) || null;
          item.project = proj ? { id: proj.id, title: proj.title, createdBy: proj.createdBy || null } : null;
          delete item.projectId;
        }
        return item;
      });
      return results;
    },
    findUnique: async ({ where, include }) => {
      if (isConnected()) {
        let query = Task.findById(where.id);
        query = applyInclude(query, include);
        const task = await query.lean();
        if (!task) return null;
        if (task.assignedTo && typeof task.assignedTo === 'object') {
          task.assignedUser = { id: task.assignedTo._id.toString(), name: task.assignedTo.name, email: task.assignedTo.email };
          delete task.assignedTo;
        }
        if (task.projectId && typeof task.projectId === 'object') {
          const proj = task.projectId;
          task.project = {
            id: proj._id.toString(),
            title: proj.title,
            createdBy: proj.createdBy ? (typeof proj.createdBy === 'object' ? proj.createdBy._bsontype === 'ObjectId' ? proj.createdBy.toString() : proj.createdBy._id?.toString() : proj.createdBy) : null,
          };
          delete task.projectId;
        }
        task.id = task._id.toString();
        delete task._id;
        delete task.__v;
        return task;
      }
      const t = findById(store.tasks, where.id);
      if (!t) return null;
      const result = { ...t };
      if (include?.project) {
        const proj = store.projects.find(p => p.id === result.projectId) || null;
        result.project = proj ? { id: proj.id, title: proj.title, createdBy: proj.createdBy || null } : null;
        delete result.projectId;
      }
      if (include?.assignedUser && result.assignedTo) {
        result.assignedUser = store.users.find(u => u.id === result.assignedTo) || null;
      }
      return result;
    },
    count: async ({ where }) => {
      if (isConnected()) {
        const { mongoWhere, projectFilter } = translateWhere(where);
        let finalWhere = mongoWhere;
        if (projectFilter) {
          const projFilter = await resolveProjectFilter(projectFilter);
          finalWhere = { ...mongoWhere, ...projFilter };
        }
        return Task.countDocuments(finalWhere);
      }
      let results = [...store.tasks];
      if (where) {
        if (where.projectId) results = results.filter(t => t.projectId === where.projectId);
        if (where.status) results = results.filter(t => t.status === where.status);
        if (where.priority) results = results.filter(t => t.priority === where.priority);
        if (where.project?.createdBy) {
          const projectIds = store.projects.filter(p => p.createdBy === where.project.createdBy).map(p => p.id);
          results = results.filter(t => projectIds.includes(t.projectId));
        }
        if (where.dueDate?.lt) {
          results = results.filter(t => t.dueDate && new Date(t.dueDate) < new Date(where.dueDate.lt));
        }
        if (where.status?.not) {
          results = results.filter(t => t.status !== where.status.not);
        }
      }
      return results.length;
    },
    update: async ({ where, data, include }) => {
      if (isConnected()) {
        const task = await Task.findByIdAndUpdate(
          where.id,
          { ...data, updatedAt: new Date() },
          { new: true }
        ).lean();
        if (!task) throw new Error('Task not found');
        task.id = task._id.toString();
        delete task._id;
        delete task.__v;
        if (include?.assignedUser && task.assignedTo) {
          const user = await User.findById(task.assignedTo);
          task.assignedUser = user ? { id: user.id, name: user.name, email: user.email } : null;
        }
        if (include?.project) {
          const project = await Project.findById(task.projectId);
          task.project = project ? { id: project.id, title: project.title, createdBy: project.createdBy ? (typeof project.createdBy === 'object' ? project.createdBy._id?.toString() || project.createdBy.toString() : project.createdBy) : null } : null;
        }
        return task;
      }
      const idx = store.tasks.findIndex(t => t.id === where.id);
      if (idx === -1) throw new Error('Task not found');
      store.tasks[idx] = { ...store.tasks[idx], ...data, updatedAt: new Date() };
      const result = { ...store.tasks[idx] };
      if (include?.assignedUser && result.assignedTo) {
        result.assignedUser = store.users.find(u => u.id === result.assignedTo) || null;
      }
      if (include?.project) {
        const proj = store.projects.find(p => p.id === result.projectId) || null;
        result.project = proj ? { id: proj.id, title: proj.title, createdBy: proj.createdBy || null } : null;
        delete result.projectId;
      }
      return result;
    },
    delete: async ({ where }) => {
      if (isConnected()) {
        await Task.deleteOne({ _id: where.id });
        return { id: where.id };
      }
      const idx = store.tasks.findIndex(t => t.id === where.id);
      if (idx === -1) throw new Error('Task not found');
      store.tasks.splice(idx, 1);
      return { id: where.id };
    },
    deleteMany: async ({ where }) => {
      if (isConnected()) {
        const result = await Task.deleteMany({ projectId: where.projectId });
        return { count: result.deletedCount };
      }
      if (where?.projectId) {
        const before = store.tasks.length;
        store.tasks = store.tasks.filter(t => t.projectId !== where.projectId);
        return { count: before - store.tasks.length };
      }
      return { count: 0 };
    },
    groupBy: async ({ by, where, _count }) => {
      if (isConnected()) {
        const { mongoWhere, projectFilter } = translateWhere(where);
        let finalWhere = mongoWhere;
        if (projectFilter) {
          const projFilter = await resolveProjectFilter(projectFilter);
          finalWhere = { ...mongoWhere, ...projFilter };
        }
        const results = await Task.aggregate([
          { $match: finalWhere },
          { $group: { _id: `$${by}`, count: { $sum: 1 } } },
        ]);
        return results.map(r => ({
          [by]: r._id,
          _count: { [by]: r.count },
        }));
      }
      let results = [...store.tasks];
      if (where?.project?.createdBy) {
        const projectIds = store.projects.filter(p => p.createdBy === where.project.createdBy).map(p => p.id);
        results = results.filter(t => projectIds.includes(t.projectId));
      }
      const grouped = {};
      results.forEach(item => {
        const key = item[by];
        if (!grouped[key]) grouped[key] = { [by]: key, _count: { [by]: 0 } };
        grouped[key]._count[by]++;
      });
      return Object.values(grouped);
    },
  },
};

const connectDB = async () => {
  if (!config.databaseUrl) {
    console.log('No DATABASE_URL configured — using in-memory store');
    return;
  }

  try {
    const conn = await mongoose.connect(config.databaseUrl);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export { db, connectDB };
