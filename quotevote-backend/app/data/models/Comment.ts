import mongoose, { Schema } from 'mongoose';
import type { CommentDocument, CommentModel } from '~/types/mongoose';

const CommentSchema = new Schema<CommentDocument, CommentModel>(
  {
    content: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created: { type: Date, required: true, default: Date.now },
    startWordIndex: { type: Number, required: true },
    endWordIndex: { type: Number, required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: false },
    url: { type: String, required: false },
    reaction: { type: String },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ content: 'text' });

CommentSchema.statics.findByPostId = function (postId: string) {
  return this.find({ postId, deleted: { $ne: true } }).sort({ created: 1 });
};

CommentSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId, deleted: { $ne: true } }).sort({ created: -1 });
};

const Comment =
  (mongoose.models.Comment as CommentModel) ||
  mongoose.model<CommentDocument, CommentModel>('Comment', CommentSchema);

export default Comment;
