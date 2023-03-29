import { middlewares, validator, crypto } from 'lts-server'

import { auditEventLogger } from '../event-logger.js'

import { tplNewUser } from '../helpers.js'

const { withScope, withPassport } = middlewares
const { validatorRequest, check } = validator
const { generateSecureCode } = crypto

const asUserResponse = ({ _id, token, email, name, phone, emailVerified, active, resetPwdRequired, role, ...others }) => 
	({ id: _id, token, email, name, phone, emailVerified, active, resetPwdRequired, role: (role && role._id) ? { id: role._id, name: role.name } : role })
const asUserRoleActionResponse = ({ _id, key, group, name, ...others }) => ({ id: _id, key, group, name })

export default ({ passport, config, services, smtp, router }) => {
	const { Role, User, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'user'

	router.get('/users',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const query = req.query
				const users = await User.getUsers(query)

				res.json({ result: users.map(asUserResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/users/actions',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const user = await User.getUserById(id)
				const role = await Role.getRoleById(user.role)
				
				res.json({ result: role.actions.map(asUserRoleActionResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.get('/users/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const user = await User.getUserById(id)

				res.json({ result: asUserResponse(user) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/users',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ 
			category,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		validatorRequest([
			check('email')
				.not().isEmpty()
				.isEmail()
				.withMessage('email is required'),
			check('name')
				.not().isEmpty()
				.withMessage('name is required'),
			check('role')
				.not().isEmpty()
				.withMessage('role is required')
		]),
		async (req, res, next) => {
			try {
				const { id } = req.user
				const { email, name, phone, role } = req.body
				const secureCode = generateSecureCode()
				const secureCodeExpDate = new Date(Date.now() + config.codeExpInMinutes * 60000)

				const user = await User.createUser({ email, name, phone, role, secureCode, secureCodeExpDate, active: true, createdBy: id })
				const url = `${config.tpl.appUrl}/verify?email=${email}`

				await smtp.sendEmail({
					to: user.email,
					subject: 'Invitation to join RGAPP',
					html: tplNewUser({
						name, url,
						code: user.secureCode
					})
				})

				return res.json({
					result: {
						message: 'An invitation email has been sent to the user\'s mailbox containing a security code to confirm their address.'
					}
				})
			} catch (error) {
				next(error)
			}
		}
	)

	router.put('/users/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const { name, phone, role } = req.body
				const user = await User.updateUser({ id }, { name, phone, role })

				res.json({ result: asUserResponse(user) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/users/:id/activate',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category: `${category} - activate` }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const user = await User.updateUserActive({ id }, { active: true })

				res.json({ result: asUserResponse(user) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.put('/users/:id/deactivate',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category: `${category} - deactivate` }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				const user = await User.updateUserActive({ id }, { active: false })

				res.json({ result: asUserResponse(user) })
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.delete('/users/:id',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({ category }),
		async (req, res, next) => {
			try {
				const { id } = req.params
				
				const { deletedCount } = await User.deleteUser({ id })
				const result = (deletedCount === 1) ? { id } : null

				res.json({ result })
			}
			catch (error) {
				next(error)
			}
		}
	)
	
	return router
}