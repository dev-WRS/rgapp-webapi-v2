import { middlewares } from 'lts-server'

const { withScope, withPassport } = middlewares

const asLpdResponse = ({ _id, taxYear, buildingType, lpd }) => ({ id: _id, taxYear, buildingType, lpd })

export default ({ passport, config, services, router }) => {
	const { Lpd } = services

	router.get('/lpds',
		withScope('webapp'),
		withPassport(passport, config)('apikey'),
		withPassport(passport, config)('jwt'),
		async (req, res, next) => {
			try {
				const lpds = await Lpd.getLpds()

				res.json({ result: lpds.map(asLpdResponse) })
			}
			catch (error) {
				next(error)
			}
		}
	)
	
	return router
}