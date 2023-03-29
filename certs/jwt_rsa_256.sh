ssh-keygen -t rsa -b 4096 -m PEM -f jwt_private.pem
# Don't add passphrase
openssl rsa -in jwt_private.pem -pubout -outform PEM -out jwt_public.pem