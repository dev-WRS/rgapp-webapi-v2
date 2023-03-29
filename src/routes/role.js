import { middlewares } from 'lts-server'

import { auditEventLogger } from '../event-logger.js'

const { withScope, withPassport } = middlewares

const asRoleResponse = ({ _id, key, description, name, actions, ...others }) => ({ 
	id: _id, key, description, name,
	actions: actions ? actions.map(({ _id, key, group, name }) => ({ id: _id, key, group, name })) : []
})

export default ({ passport, config, services, smtp, router }) => {
	const { Role, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'role'

	router.get('/roles',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const roles = await Role.getRoles()

				res.json({ result: roles.map(asRoleResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/roles/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const role = await Role.getRoleById(id)

				res.json({ result: asRoleResponse(role) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/roles/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const { actions } = req.body
				const role = await Role.updateRole({ _id: id }, { actions })

				res.json({ result: asRoleResponse(role) })
			}
			catch (error) {
				next(error)
			}
		}
	)
	
	return router
}