export default ({ db }) => {
	const { mongoose } = db
	const { AuditLog } = mongoose

	return {
		createLog: (log) => AuditLog.create(log)
	}
}