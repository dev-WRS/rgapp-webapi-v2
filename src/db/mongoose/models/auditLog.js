import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
	action: { 
		type: String, 
		required: true 
	},
	category: { 
		type: String, 
		required: true 
	},
	createdBy: { 
		type: mongoose.Types.ObjectId,
		ref: 'User',
		required: true
	},
	message: { 
		type: String, 
		required: true 
	},
	data: { 
		type: mongoose.SchemaTypes.Mixed
	},
	parentId: {
		type: mongoose.Types.ObjectId,
		ref: 'AuditLog'
	}
}, {
	timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog