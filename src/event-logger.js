import _ from 'lodash'

const handleAuditEventLogger = (AuditLog) => ({ parentId, category, asResult, ...others }) => (req, res) => {
	const json = res.json
	
	//interceptor
	res.json = jsonData => {
		Object.assign(res.locals, { responseData: jsonData })
		json.call(res, jsonData)
	}
	
	return async () => {
		const { id: createdBy } = req.user
		const { responseData } = res.locals
		
		await AuditLog.createLog({
			action: req.method,
			category: category || req.path,
			createdBy,
			message: 'response',
			data: asResult ? asResult(responseData) : null,
			parentId
		})
	}
}

export const auditEventLogger = (AuditLog) => ({ category, asParams, asResult, ...others }) => async (req, res, next) => {
	const { id: createdBy } = req.user || {}

	const auditLog = await AuditLog.createLog({
		action: req.method,
		category: category || req.path,
		createdBy,
		message: 'request',
		data: asParams ? asParams(req) : _.merge({}, req.params, req.query)
	})

	if (asResult) {
		res.once('finish', handleAuditEventLogger(AuditLog)({
			parentId: auditLog.id, 
			category, asResult, 
			...others })(req, res))
	}

	next()
}