import { middlewares, validator, crypto, errors } from 'lts-server'

import { auditEventLogger } from '../event-logger.js'

const { withScope, withPassport } = middlewares
const { validatorRequest, check } = validator
const { generateSecureCode, generateSalt, generateHash, verify } = crypto
const { HttpUnauthorizedError } = errors

const asUserResponse = ({ _id, token, email, name, phone, role, emailVerified, resetPwdRequired, ...others }) => ({ id: _id, token, email, name, phone, 
	role: (role && role._id) ? { id: role._id, name: role.name } : role,
	emailVerified, resetPwdRequired })

export default ({ passport, config, services, smtp, router }) => {
	const { Auth, AuditLog } = services
	const withAuditLogger = auditEventLogger(AuditLog)
	const category = 'auth'

	router.post('/authenticate',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({
			category: `${category}-authenticate`,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		async (req, res, next) => {
			const { id, token } = req.user
			const user = await Auth.getUserById(id)

			res.json({ result: asUserResponse(Object.assign(user.toObject(), { token })) })
		}
	)

	router.post('/login',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		validatorRequest([
			check('email')
				.not().isEmpty()
				.isEmail()
				.withMessage('email is required'),
			check('password')
				.not().isEmpty()
				.withMessage('password is required')
		]),
		withPassport(passport, config)('login'),
		withAuditLogger({
			category: `${category}-login`,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		async (req, res) => {
			const { id, token } = req.user
			const user = await Auth.getUserById(id)

			res.json({ result: asUserResponse(Object.assign(user.toObject(), { token })) })
		}
	)

	router.post('/send-code',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		validatorRequest([
			check('email')
				.not().isEmpty()
				.isEmail()
				.withMessage('email is required')
		]),
		async (req, res, next) => {
			try {
				const { email } = req.body
				const user = await Auth.getUserByEmail(email, false)

				if (user) {
					const secureCode = generateSecureCode()
					const secureCodeExpDate = new Date(Date.now() + config.codeExpInMinutes * 60000)

					const user = await Auth.updateUser({ email }, { secureCode, secureCodeExpDate })

					await smtp.sendEmail({
						to: user.email,
						subject: 'Email confirmation',
						text: user.secureCode
					})
				}

				return res.json({
					result: {
						message: 'An email has been sent to your mailbox containing the security code to update the password'
					}
				})
			}
			catch (error) {
				next(error)
			}
		}
	)

	router.post('/email-verify',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		validatorRequest([
			check('email')
				.not().isEmpty()
				.isEmail()
				.withMessage('email is required'),
			check('secureCode')
				.not().isEmpty()
				.withMessage('secure code is required')
		]),
		withPassport(passport, config)('emailVerify'),
		withAuditLogger({
			category: `${category}-email-verify`,
			asResult: ({ result }) => ({ id: result ? result.id : null })
		}),
		async (req, res, next) => {
			const { id, token } = req.user
			const { resetPwdRequired } = req.body
			const user = await Auth.updateUser({ _id: id }, { emailVerified: true })

			res.json({ result: asUserResponse(Object.assign(user.toObject(), { 
				token,
				resetPwdRequired
			})) })
		}
	)

	router.post('/reset-password',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({
			category: `${category}-reset-password`
		}),
		validatorRequest([
			check('email')
				.not().isEmpty()
				.withMessage('email is required'),
			check('newPassword')
				.not().isEmpty()
				.withMessage('new password is required')
		]),
		async (req, res, next) => {
			const { id, email: emailUser } = req.user
			const { email, newPassword } = req.body
			
			if (email === emailUser) {
				const salt = generateSalt()
				const hash = generateHash(newPassword, salt)

				await Auth.updateUser({ _id: id }, { salt, hash })

				res.json({ 
					result: { 
						message: 'Your password has been changed successfully' 
					} 
				})
			}
			else {
				next(new HttpUnauthorizedError('User email mismatch'))
			}
		}
	)

	router.post('/change-password',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		withAuditLogger({
			category: `${category}-change-password`
		}),
		validatorRequest([
			check('currentPassword')
				.not().isEmpty()
				.withMessage('current password is required'),
			check('newPassword')
				.not().isEmpty()
				.isLength({ min: 7 })
				.withMessage('new password is required')
		]),
		async (req, res, next) => {
			const { id, email } = req.user
			const { currentPassword, newPassword } = req.body
			const user = await Auth.getUserByEmail(email)

			if (user) {
				const { hash: userHash, salt: userSalt } = user.toObject()

				if (verify(currentPassword, userSalt, userHash)) {
					const salt = generateSalt()
					const hash = generateHash(newPassword, salt)

					await Auth.updateUser({ _id: id }, { salt, hash })

					res.json({ 
						result: { 
							message: 'Your password has been changed successfully' 
						} 
					})
				} else {
					next(new HttpUnauthorizedError('Incorrect current password'))
				}
			}
			else {
				next(new HttpUnauthorizedError('Incorrect email and/or password'))
			}
		}
	)

	return router
}