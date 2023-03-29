import { middlewares } from 'lts-server'

const { withScope, withPassport } = middlewares

const asActionResponse = ({ _id, key, group, name, ...others }) => ({ id: _id, key, group, name })

export default ({ passport, config, services, router }) => {
	const { Action } = services

	router.get('/actions',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const actions = await Action.getActions()

				res.json({ result: actions.map(asActionResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)
	
	return router
}