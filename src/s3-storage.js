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

	const storage = {
		provider: s3,

		deleteObject: ({ bucket, key }) => new Promise((resolve, reject) => {
			s3.deleteObject({ Bucket: bucket, Key: key }, (error, data) => error ? reject(error) : resolve(data))
		}),

		getObject: ({ bucket, key }) => new Promise((resolve, reject) => {
			s3.getObject({ 
				Bucket: bucket, 
				Key: key, 
				ResponseContentEncoding: 'base64'//config.aws.contentEncoding
			}, (error, data) => error ? reject(error) : resolve({
				body: data.Body
			}))
		}),
		
		getObjectStream: ({ bucket, key }) => new Promise((resolve, reject) => {
			try {
				const stream = s3.getObject({ 
					Bucket: bucket, 
					Key: key, 
					ResponseContentEncoding: config.aws.contentEncoding
				}).createReadStream()
	
				resolve(stream)
			}
			catch (error) {
				reject(error)
			}
		}),

		uploadObjectStream: ({ bucket, key, contentEncoding }, stream) => new Promise((resolve, reject) => {
			try {
				stream.on('error', (error) => {
					reject(error)
				})

				s3.upload({
					Bucket: bucket,
					Key: key,
					Body: stream,
					ContentEncoding: contentEncoding
				}, (error, data) => error ? reject(error) : resolve({
					location: data.Location,
					eTag: data.ETag,
					bucket: data.Bucket,
					key: data.Key
				}))
			}
			catch (error) {
				reject(error)
			}
		})
	}
	
	return storage
}

export default init