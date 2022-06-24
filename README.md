# Screver Backend

## ⚡ Project Environment
* Nodejs - v10.15.0
* Redis server - v4.0.9
* MongoDB - v4.0.4

## ‍💻 Setup Project
Before run the project you should setup Redis and MongoDB on your system.
We use MongoDB transactions, so MongoDB should be deployment only with Replica Set!

### Install Redis
For Development - MacOS
```sh
brew update
brew install redis
brew services start redis
redis-server /usr/local/etc/redis.conf
```
[Instruction of Redis installtion on Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04).

For Production server you can check [detailed instruction](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-18-04).

### Install MongoDB
Now you can use one of few different ways to setup mongodb with replica set.

#### The most fastest way.
Only for run locally tests or for frontend developers which should setup Screver backend on they systems.(OSX or Linux)
```js
npm install run-rs -g
run-rs --version 4.0.0
```
Run-rs will download MongoDB 4.0.0 for you.

#### Right way for backend development.(OSX or Linux)
Install MongoDB v4.0.0+ on your system.

Deploy Replica Set:
```bash
# Create data directories for each replica member
mkdir -p /data/db/rs0-0  /data/db/rs0-1 /data/db/rs0-2

# Start your mongod instances
sudo mongod --replSet rs0 --port 27017 --dbpath /data/db/rs0-0 --bind_ip localhost --smallfiles --oplogSize 128 --fork --logpath /var/log/mongod.log
sudo mongod --replSet rs0 --port 27018 --dbpath /data/db/rs0-1 --bind_ip localhost --smallfiles --oplogSize 128 --fork --logpath /var/log/mongod.log
sudo mongod --replSet rs0 --port 27019 --dbpath /data/db/rs0-2 --bind_ip localhost --smallfiles --oplogSize 128 --fork --logpath /var/log/mongod.log

# Configurate replica set
mongo --port 27017
rsconf = {
  _id: "rs0",
  members: [
    {
     _id: 0,
     host: "localhost:27017"
    },
    {
     _id: 1,
     host: "localhost:27018"
    },
    {
     _id: 2,
     host: "localhost:27019"
    }
   ]
}

rs.initiate( rsconf )
```
#### For production server.
You can check how deploy replica set with access control on production server
in official detailed [MongoDB Documentation](https://docs.mongodb.com/manual/tutorial/deploy-replica-set-with-keyfile-access-control/).

### Install dependencies:
```sh
npm i
```

### Rename .example.env to .env and set all ENV variables
```sh
mv .example.env .env
```

### Start server:
```sh
# Start server
npm run start
```

## ❓ How to use

### Tests:
```sh
# Run tests written in ES6 along with code coverage
npm run test

# Run tests on file change
npm run test:watch

# Run tests enforcing code coverage (configured via .istanbul.yml)
npm run test:check-coverage
```

### Lint:
```sh
# Lint code with ESLint
npm run lint

# Run lint on any file change
npm run lint:watch
```

### Deployment:
```sh
# compile to ES5
1. npm run build

# upload dist/ to your server
2. scp -rp dist/ user@dest:/path

# install production dependencies only
3. npm run --production

# Use any process manager to start your services
4. pm2 start dist/index.js
```

## 💥 How to add a new
### Controllers
### Models
### Services
### Tests
