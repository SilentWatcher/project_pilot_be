import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  dueDate: { type: Date, default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

taskSchema.index({ projectId: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, priority: 1 });
taskSchema.index({ assignedTo: 1 });

taskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.projectId && typeof ret.projectId === 'object') {
      if (ret.projectId._bsontype === 'ObjectId') {
        ret.projectId = ret.projectId.toString();
      } else if (ret.projectId._id) {
        ret.projectId.id = ret.projectId._id.toString();
        delete ret.projectId._id;
      }
    }
    if (ret.assignedTo && typeof ret.assignedTo === 'object') {
      if (ret.assignedTo._bsontype === 'ObjectId') {
        ret.assignedTo = ret.assignedTo.toString();
      } else if (ret.assignedTo._id) {
        ret.assignedTo.id = ret.assignedTo._id.toString();
        delete ret.assignedTo._id;
      }
    }
    return ret;
  },
});

export default mongoose.model('Task', taskSchema);
