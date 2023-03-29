import awsSdk from 'aws-sdk'
import { crypto } from 'lts-server'

const { decrypt } = crypto

const init = async ({ config, services }) => {
	const { Vault } = services
	let s3

	if (Vault && (global.jestRuntime !== true)) {
		const aws = await Vault.getByKey('aws')
		const decrypted = decrypt(config.phrase, aws.value)
		const { clientId, clientSecret } = JSON.parse(decrypted)

		s3 = new awsSdk.S3({
			credentials: {
				secretAccessKey: clientSecret,
				accessKeyId: clientId
			},
			region: 'us-east-2'
		})
	}
	else {
		s3 = new awsSdk.S3()
	}

	return s3
}

export default init