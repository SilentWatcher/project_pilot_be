import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  deadline: { type: Date, default: null },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true } });

projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'projectId',
});

projectSchema.index({ createdBy: 1, createdAt: -1 });
projectSchema.index({ createdBy: 1, status: 1 });
projectSchema.index({ createdBy: 1, title: 1 });

projectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.createdBy && typeof ret.createdBy === 'object') {
      if (ret.createdBy._bsontype === 'ObjectId') {
        ret.createdBy = ret.createdBy.toString();
      } else if (ret.createdBy._id) {
        ret.createdBy.id = ret.createdBy._id.toString();
        delete ret.createdBy._id;
      }
    }
    return ret;
  },
});

export default mongoose.model('Project', projectSchema);
