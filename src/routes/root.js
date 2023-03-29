import { middlewares } from 'lts-server'

const { withScope, withPassport } = middlewares

export default ({ passport, config, router }) => {

	router.get('/',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		(req, res, next) => {
			res.end()
		}
	)
	
	router.get('/jwt',
		withPassport(passport, config)('jwt'),
		(req, res, next) => {
			res.end()
		}
	)

	return router
}